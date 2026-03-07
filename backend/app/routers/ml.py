from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..ml_models.predict_delay import predict_delay as run_prediction

router = APIRouter(tags=["ml"])


class DelayPredictionFeatures(BaseModel):
    past_completion_time: float = Field(ge=0)
    task_type: str
    assigned_role: str
    current_workload: int = Field(ge=0)


class DelayPredictionRequest(BaseModel):
    tenant_id: str | int
    features: DelayPredictionFeatures


@router.post("/predict-delay")
def predict_delay(payload: DelayPredictionRequest) -> dict[str, Any]:
    try:
        return run_prediction(str(payload.tenant_id), payload.features.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
