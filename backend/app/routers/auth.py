import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..dependencies import get_current_active_user, get_db

router = APIRouter(prefix="/auth", tags=["auth"])

_otp_store: dict[str, str] = {}


@router.post("/register", response_model=schemas.UserOut)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    tenant_id = payload.tenant_id
    if not tenant_id:
        if not payload.tenant_name:
            raise HTTPException(status_code=400, detail="tenant_id or tenant_name is required")
        tenant = models.Tenant(name=payload.tenant_name)
        db.add(tenant)
        db.flush()
        tenant_id = tenant.id

    user = models.User(
        email=payload.email,
        hashed_password=auth.get_password_hash(payload.password),
        role=payload.role,
        tenant_id=tenant_id,
        full_name=payload.full_name,
    )
    db.add(user)
    db.flush()

    db.add(models.UserRole(user_id=user.id, role=payload.role))
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = auth.create_access_token(
        {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return schemas.Token(access_token=access_token)


@router.post("/request-otp")
def request_otp(payload: schemas.PhoneAuthRequest):
    _otp_store[payload.phone] = "123456"
    return {"message": "OTP generated", "expires_in_seconds": 300}


@router.post("/verify-otp", response_model=schemas.Token)
def verify_otp(payload: schemas.PhoneVerifyRequest, db: Session = Depends(get_db)):
    if _otp_store.get(payload.phone) != payload.token:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    email = f"{payload.phone}@phone.local"
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        default_tenant = db.query(models.Tenant).first()
        if not default_tenant:
            default_tenant = models.Tenant(name="Default Tenant")
            db.add(default_tenant)
            db.flush()
        user = models.User(
            email=email,
            hashed_password=auth.get_password_hash(str(uuid.uuid4())),
            role=models.UserRoleEnum.user.value,
            tenant_id=default_tenant.id,
            full_name=payload.phone,
        )
        db.add(user)
        db.flush()
        db.add(models.UserRole(user_id=user.id, role=models.UserRoleEnum.user.value))
        db.commit()
        db.refresh(user)

    token = auth.create_access_token(
        {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
    )
    return schemas.Token(access_token=token)


@router.post("/demo-login")
def demo_login(payload: schemas.DemoLoginRequest, db: Session = Depends(get_db)):
    role_map = {
        "system_admin": models.UserRoleEnum.admin.value,
        "tenant_admin": models.UserRoleEnum.admin.value,
        "manager": models.UserRoleEnum.manager.value,
        "team_lead": models.UserRoleEnum.manager.value,
        "team_member": models.UserRoleEnum.user.value,
    }
    role = role_map.get(payload.role, models.UserRoleEnum.user.value)
    email = f"demo_{payload.role}@tenantflow.local"

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        tenant = db.query(models.Tenant).first()
        if not tenant:
            tenant = models.Tenant(name="Demo Tenant")
            db.add(tenant)
            db.flush()
        user = models.User(
            email=email,
            hashed_password=auth.get_password_hash("demo-password"),
            role=role,
            tenant_id=tenant.id,
            full_name=payload.role.replace("_", " ").title(),
        )
        db.add(user)
        db.flush()
        db.add(models.UserRole(user_id=user.id, role=role))
        db.commit()
        db.refresh(user)

    token = auth.create_access_token(
        {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
    )
    return {
        "session": {
            "access_token": token,
            "refresh_token": token,
            "token_type": "bearer",
        }
    }


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_active_user)):
    return current_user
