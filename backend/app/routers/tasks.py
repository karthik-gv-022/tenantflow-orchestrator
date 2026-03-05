from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_current_active_user, get_db

router = APIRouter(prefix="/tasks", tags=["tasks"])

STATUS_MAP = {
    "created": "Created",
    "assigned": "Assigned",
    "in_progress": "In Progress",
    "review": "Under Review",
    "under_review": "Under Review",
    "completed": "Completed",
    "delayed": "Delayed",
}

REVERSE_STATUS_MAP = {v: k for k, v in STATUS_MAP.items()}
REVERSE_STATUS_MAP["Under Review"] = "review"
REVERSE_STATUS_MAP["In Progress"] = "in_progress"


def _to_internal_status(value: str | None) -> str | None:
    if value is None:
        return None
    return STATUS_MAP.get(value, value)


def _to_frontend(task: models.Task) -> dict[str, Any]:
    return {
        "id": str(task.id),
        "tenant_id": str(task.tenant_id),
        "project_id": None,
        "title": task.title,
        "description": task.description,
        "status": REVERSE_STATUS_MAP.get(task.status, task.status.lower().replace(" ", "_")),
        "priority": task.priority,
        "assignee_id": str(task.assigned_to) if task.assigned_to else None,
        "created_by": str(task.created_by) if task.created_by else "",
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "sla_hours": None,
        "started_at": None,
        "completed_at": None,
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
    }


def _apply_delayed_status(task: models.Task):
    if task.status == "Completed" or not task.due_date:
        return
    if task.due_date.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        task.status = "Delayed"


@router.get("/", response_model=schemas.GenericResponse)
def get_tasks(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    q = db.query(models.Task).filter(
        models.Task.tenant_id == current_user.tenant_id,
        models.Task.is_deleted.is_(False),
    )

    total = q.count()
    items = (
        q.order_by(models.Task.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    changed = False
    for task in items:
        old = task.status
        _apply_delayed_status(task)
        changed = changed or old != task.status
    if changed:
        db.commit()

    return {
        "data": {
            "items": [_to_frontend(t) for t in items],
            "page": page,
            "page_size": page_size,
            "total": total,
        }
    }


@router.post("/", response_model=schemas.GenericResponse)
def create_task(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    if current_user.role not in {
        models.UserRoleEnum.admin.value,
        models.UserRoleEnum.manager.value,
        models.UserRoleEnum.user.value,
    }:
        raise HTTPException(status_code=403, detail="Insufficient role")

    if current_user.role == models.UserRoleEnum.user.value and payload.get("assignee_id") not in {
        None,
        str(current_user.id),
    }:
        raise HTTPException(status_code=403, detail="Users cannot assign tasks to others")

    due_date = payload.get("due_date")
    task = models.Task(
        title=payload.get("title", "Untitled task"),
        description=payload.get("description"),
        status=_to_internal_status(payload.get("status", "created")) or "Created",
        priority=payload.get("priority", "medium"),
        complexity_score=float(payload.get("complexity_score", 0.0) or 0.0),
        due_date=datetime.fromisoformat(due_date.replace("Z", "+00:00")) if due_date else None,
        assigned_to=payload.get("assignee_id") or payload.get("assigned_to"),
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    _apply_delayed_status(task)
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"data": _to_frontend(task)}


@router.put("/{task_id}", response_model=schemas.GenericResponse)
def update_task(
    task_id: str,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    task = (
        db.query(models.Task)
        .filter(
            models.Task.id == task_id,
            models.Task.tenant_id == current_user.tenant_id,
            models.Task.is_deleted.is_(False),
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == models.UserRoleEnum.user.value and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="User can only update assigned tasks")

    if current_user.role == models.UserRoleEnum.manager.value and "assignee_id" in payload:
        task.assigned_to = payload["assignee_id"]

    for key in ["title", "description", "priority", "complexity_score"]:
        if key in payload:
            setattr(task, key, payload[key])

    if "status" in payload:
        task.status = _to_internal_status(payload["status"]) or task.status

    if "due_date" in payload:
        due_date = payload.get("due_date")
        task.due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00")) if due_date else None

    if "assignee_id" in payload and current_user.role in {
        models.UserRoleEnum.admin.value,
        models.UserRoleEnum.manager.value,
    }:
        task.assigned_to = payload["assignee_id"]

    task.updated_by = current_user.id
    task.updated_at = datetime.utcnow()
    _apply_delayed_status(task)

    db.commit()
    db.refresh(task)
    return {"data": _to_frontend(task)}


@router.delete("/{task_id}", response_model=schemas.GenericResponse)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    task = (
        db.query(models.Task)
        .filter(
            models.Task.id == task_id,
            models.Task.tenant_id == current_user.tenant_id,
            models.Task.is_deleted.is_(False),
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role != models.UserRoleEnum.admin.value and task.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only admins or creators can delete tasks")

    task.is_deleted = True
    task.updated_by = current_user.id
    task.updated_at = datetime.utcnow()
    db.commit()
    return {"data": {"deleted": True}}
