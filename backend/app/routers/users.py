from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_current_active_user, get_current_admin, get_db

router = APIRouter(prefix="/users", tags=["users"])

MODEL_MAP: dict[str, Any] = {
    "profiles": models.User,
    "user_roles": models.UserRole,
    "projects": models.Project,
    "notifications": models.Notification,
    "activity_feed": models.ActivityFeed,
    "task_comments": models.TaskComment,
    "user_sessions": models.UserSession,
    "audit_logs": models.AuditLog,
    "tenant_model_weights": models.TenantModelWeight,
    "federated_training_rounds": models.FederatedTrainingRound,
    "model_evaluation_results": models.ModelEvaluationResult,
    "task_delay_predictions": models.TaskDelayPrediction,
    "tasks": models.Task,
}


def _serialize_profile(user: models.User) -> dict[str, Any]:
    return {
        "id": str(user.id),
        "user_id": str(user.id),
        "tenant_id": str(user.tenant_id),
        "email": user.email,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat(),
    }


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user


@router.get("/", response_model=list[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    return db.query(models.User).filter(models.User.tenant_id == current_user.tenant_id).all()


@router.post("/data/{table}", response_model=schemas.GenericResponse)
def generic_insert(
    table: str,
    payload: schemas.GenericMutation,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    model = MODEL_MAP.get(table)
    if not model:
        raise HTTPException(status_code=404, detail="Unsupported table")

    rows = payload.payload if isinstance(payload.payload, list) else [payload.payload]
    created = []

    for row in rows:
        row_data = dict(row)
        if table == "activity_feed" and "metadata" in row_data:
            row_data["metadata_json"] = row_data.pop("metadata")
        if hasattr(model, "tenant_id") and "tenant_id" not in row_data:
            row_data["tenant_id"] = current_user.tenant_id
        if table == "profiles":
            raise HTTPException(status_code=400, detail="Profiles are derived from users")
        if table == "user_roles" and current_user.role != models.UserRoleEnum.admin.value:
            raise HTTPException(status_code=403, detail="Only admins can modify roles")

        item = model(**row_data)
        db.add(item)
        db.flush()
        created.append(item)

    db.commit()

    if table == "profiles":
        data = [_serialize_profile(item) for item in created]
    else:
        data = []
        for item in created:
            serialized = {k: (str(v) if hasattr(v, "hex") else v) for k, v in vars(item).items() if not k.startswith("_")}
            if table == "activity_feed" and "metadata_json" in serialized:
                serialized["metadata"] = serialized.pop("metadata_json")
            data.append(serialized)

    return {"data": data[0] if len(data) == 1 else data}


@router.get("/data/{table}", response_model=schemas.GenericResponse)
def generic_select(
    table: str,
    eq: str | None = Query(default=None),
    in_filters: str | None = Query(default=None, alias="in"),
    order_by: str | None = Query(default=None),
    ascending: bool = Query(default=True),
    limit: int | None = Query(default=None, ge=1, le=500),
    single: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    model = MODEL_MAP.get(table)
    if not model:
        raise HTTPException(status_code=404, detail="Unsupported table")

    if table == "profiles":
        q = db.query(models.User).filter(models.User.tenant_id == current_user.tenant_id)
        if eq:
            for pair in eq.split(","):
                if not pair:
                    continue
                key, value = pair.split(":", 1)
                if key == "user_id":
                    q = q.filter(models.User.id == value)
                elif key == "tenant_id":
                    q = q.filter(models.User.tenant_id == value)
        users = q.all()
        profiles = [_serialize_profile(u) for u in users]
        return {"data": profiles[0] if single and profiles else profiles}

    q = db.query(model)

    if hasattr(model, "tenant_id"):
        q = q.filter(model.tenant_id == current_user.tenant_id)

    if eq:
        conditions = []
        for pair in eq.split(","):
            if not pair:
                continue
            key, value = pair.split(":", 1)
            column = getattr(model, key, None)
            if column is not None:
                conditions.append(column == value)
        if conditions:
            q = q.filter(and_(*conditions))

    if in_filters:
        for spec in in_filters.split(";"):
            if not spec:
                continue
            key, values = spec.split(":", 1)
            column = getattr(model, key, None)
            if column is not None:
                q = q.filter(column.in_(values.split("|")))

    if order_by and hasattr(model, order_by):
        col = getattr(model, order_by)
        q = q.order_by(col.asc() if ascending else col.desc())

    if limit is not None:
        q = q.limit(limit)

    rows = q.first() if single else q.all()

    def serialize(item: Any) -> dict[str, Any]:
        raw = {k: v for k, v in vars(item).items() if not k.startswith("_")}
        serialized = {
            k: (v.isoformat() if isinstance(v, datetime) else str(v) if hasattr(v, "hex") else v)
            for k, v in raw.items()
        }
        if table == "activity_feed" and "metadata_json" in serialized:
            serialized["metadata"] = serialized.pop("metadata_json")
        return serialized

    if single:
        return {"data": serialize(rows) if rows else None}
    return {"data": [serialize(item) for item in rows]}


@router.put("/data/{table}", response_model=schemas.GenericResponse)
def generic_update(
    table: str,
    payload: schemas.GenericMutation,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    model = MODEL_MAP.get(table)
    if not model:
        raise HTTPException(status_code=404, detail="Unsupported table")

    q = db.query(model)
    if hasattr(model, "tenant_id"):
        q = q.filter(model.tenant_id == current_user.tenant_id)

    for key, value in payload.eq.items():
        column = getattr(model, key, None)
        if column is not None:
            q = q.filter(column == value)

    records = q.all()
    if not records:
        return {"data": None}

    for record in records:
        update_payload = dict(payload.payload)
        if table == "activity_feed" and "metadata" in update_payload:
            update_payload["metadata_json"] = update_payload.pop("metadata")
        for key, value in update_payload.items():
            if hasattr(record, key):
                setattr(record, key, value)
        if hasattr(record, "updated_at"):
            setattr(record, "updated_at", datetime.utcnow())

    db.commit()
    first = records[0]
    data = {k: v for k, v in vars(first).items() if not k.startswith("_")}
    if table == "activity_feed" and "metadata_json" in data:
        data["metadata"] = data.pop("metadata_json")
    return {
        "data": {
            k: (v.isoformat() if isinstance(v, datetime) else str(v) if hasattr(v, "hex") else v)
            for k, v in data.items()
        }
    }


@router.delete("/data/{table}", response_model=schemas.GenericResponse)
def generic_delete(
    table: str,
    eq: str = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    model = MODEL_MAP.get(table)
    if not model:
        raise HTTPException(status_code=404, detail="Unsupported table")

    q = db.query(model)
    if hasattr(model, "tenant_id"):
        q = q.filter(model.tenant_id == current_user.tenant_id)

    for pair in eq.split(","):
        key, value = pair.split(":", 1)
        column = getattr(model, key, None)
        if column is not None:
            q = q.filter(column == value)

    deleted = q.delete(synchronize_session=False)
    db.commit()
    return {"data": {"deleted": deleted}}
