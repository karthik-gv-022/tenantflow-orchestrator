import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    sub: str | None = None


class TenantCreate(BaseModel):
    name: str


class TenantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    created_at: datetime


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["admin", "manager", "user"] = "user"
    tenant_name: str | None = None
    tenant_id: uuid.UUID | None = None
    full_name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PhoneAuthRequest(BaseModel):
    phone: str


class PhoneVerifyRequest(BaseModel):
    phone: str
    token: str


class DemoLoginRequest(BaseModel):
    role: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role: str
    tenant_id: uuid.UUID
    full_name: str | None = None
    avatar_url: str | None = None
    created_at: datetime
    updated_at: datetime
    is_active: bool


class ProfileOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    full_name: str | None
    avatar_url: str | None
    created_at: datetime
    updated_at: datetime


class RoleOut(BaseModel):
    user_id: uuid.UUID
    role: str


class TaskBase(BaseModel):
    title: str
    description: str | None = None
    status: str = "Created"
    priority: str = "medium"
    complexity_score: float = 0.0
    due_date: datetime | None = None
    assigned_to: uuid.UUID | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    complexity_score: float | None = None
    due_date: datetime | None = None
    assigned_to: uuid.UUID | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    status: str
    priority: str
    complexity_score: float
    due_date: datetime | None
    assigned_to: uuid.UUID | None
    tenant_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None
    updated_by: uuid.UUID | None
    is_deleted: bool


class PaginatedTasks(BaseModel):
    items: list[TaskOut]
    page: int
    page_size: int
    total: int


class CompletionRate(BaseModel):
    completion_rate: float


class WorkloadDistributionItem(BaseModel):
    user_id: uuid.UUID
    workload_count: int


class MemberPerformanceItem(BaseModel):
    user_id: uuid.UUID
    completed_tasks: int
    total_tasks: int
    completion_ratio: float


class DelayRate(BaseModel):
    delay_rate: float


class DelayPredictInput(BaseModel):
    complexity_score: float
    workload_count: int
    past_delay_count: int
    average_completion_time: float


class DelayPredictOutput(BaseModel):
    delay_probability: float
    risk_level: str
    accuracy: float
    precision: float
    recall: float


class GenericQuery(BaseModel):
    eq: dict[str, Any] = Field(default_factory=dict)
    in_filters: dict[str, list[Any]] = Field(default_factory=dict, alias="in")
    order_by: str | None = None
    ascending: bool = True
    single: bool = False


class GenericMutation(BaseModel):
    payload: dict[str, Any] | list[dict[str, Any]]
    eq: dict[str, Any] = Field(default_factory=dict)


class GenericResponse(BaseModel):
    data: Any
