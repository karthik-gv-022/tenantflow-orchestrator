import os
import joblib

from .feature_engineering import prepare_features_for_prediction

REQUIRED_FEATURES = {
    "past_completion_time",
    "task_type",
    "assigned_role",
    "current_workload",
}


def predict_delay(tenant_id: str, features: dict):
    tenant_key = str(tenant_id)
    model_path = os.path.join(os.path.dirname(__file__), "saved_models", f"tenant_{tenant_key}_model.joblib")
    if not os.path.exists(model_path):
        return {"label": "No", "reason": "Model not trained for tenant"}

    if not isinstance(features, dict):
        raise ValueError("features must be a dictionary")

    missing = sorted(REQUIRED_FEATURES - set(features.keys()))
    if missing:
        raise ValueError(f"Missing required feature fields: {', '.join(missing)}")

    payload = joblib.load(model_path)
    model = payload["model"]
    feature_columns = payload["feature_columns"]

    X = prepare_features_for_prediction(features, feature_columns)
    prediction = model.predict(X)[0]
    confidence = float(model.predict_proba(X)[0][1]) if hasattr(model, "predict_proba") else None

    label = "Yes" if int(prediction) == 1 else "No"
    return {
        "label": label,
        "reason": payload.get("model_name", "Model"),
        "confidence": confidence,
    }
