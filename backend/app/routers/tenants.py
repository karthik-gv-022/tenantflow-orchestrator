from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_current_admin, get_db

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post("/", response_model=schemas.TenantOut)
def create_tenant(
    payload: schemas.TenantCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    tenant = models.Tenant(name=payload.name)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.get("/", response_model=list[schemas.TenantOut])
def list_tenants(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    return db.query(models.Tenant).all()
