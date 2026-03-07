import os
import joblib
import pandas as pd
from sqlalchemy import create_engine, text
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB

from .feature_engineering import prepare_training_data

ALLOWED_MODELS = {
    "Logistic Regression": lambda: LogisticRegression(max_iter=1000, random_state=42),
    "Decision Tree": lambda: DecisionTreeClassifier(random_state=42),
    "Naive Bayes": lambda: GaussianNB(),
}


def load_data(tenant_id: str, database_url: str) -> pd.DataFrame:
    engine = create_engine(database_url)
    query = text(
        """
        SELECT
            CAST(t.tenant_id AS TEXT) AS tenant_id,
            COALESCE(t.complexity_score * 10.0, 0.0) AS past_completion_time,
            COALESCE(NULLIF(t.priority, ''), 'general') AS task_type,
            COALESCE(u.role, 'user') AS assigned_role,
            COALESCE(
                (
                    SELECT COUNT(*)
                    FROM tasks w
                    WHERE w.tenant_id = t.tenant_id
                      AND w.assigned_to = t.assigned_to
                      AND w.is_deleted = FALSE
                      AND w.status NOT IN ('Completed', 'Delayed')
                ),
                0
            ) AS current_workload,
            CASE WHEN t.status = 'Delayed' THEN 1 ELSE 0 END AS actual_delay
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to
        WHERE CAST(t.tenant_id AS TEXT) = :tenant_id
          AND t.is_deleted = FALSE
          AND t.status IN ('Completed', 'Delayed')
        """
    )
    df = pd.read_sql_query(query, engine, params={"tenant_id": str(tenant_id)})
    return df


def train_and_save_model(tenant_id: str, database_url: str, preferred_model: str | None = None):
    if preferred_model and preferred_model not in ALLOWED_MODELS:
        raise ValueError(f"Model must be one of: {', '.join(ALLOWED_MODELS.keys())}")

    tenant_key = str(tenant_id)
    df = load_data(tenant_key, database_url)
    if df.empty:
        raise ValueError("No labeled historical data found for this tenant.")

    X, y, feature_columns = prepare_training_data(df)
    if y.nunique() < 2:
        raise ValueError("Need both delayed and non-delayed tasks to train classification models.")

    stratify_target = y if y.nunique() > 1 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=stratify_target,
    )

    candidates = [preferred_model] if preferred_model else list(ALLOWED_MODELS.keys())
    scores: dict[str, float] = {}
    best_model_name = ""
    best_model = None
    best_accuracy = -1.0

    for model_name in candidates:
        model = ALLOWED_MODELS[model_name]()
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        accuracy = float(accuracy_score(y_test, y_pred))
        scores[model_name] = accuracy

        if accuracy > best_accuracy:
            best_accuracy = accuracy
            best_model_name = model_name
            best_model = model

    if best_model is None:
        raise ValueError("Unable to train a model for the provided tenant data.")

    model_dir = os.path.join(os.path.dirname(__file__), "saved_models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, f"tenant_{tenant_key}_model.joblib")

    joblib.dump(
        {
            "tenant_id": tenant_key,
            "model": best_model,
            "feature_columns": feature_columns,
            "model_name": best_model_name,
            "accuracy": best_accuracy,
            "scores": scores,
        },
        model_path,
    )

    return {
        "model_path": model_path,
        "model_name": best_model_name,
        "accuracy": best_accuracy,
        "scores": scores,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Train delay prediction model per tenant")
    parser.add_argument("--tenant_id", required=True)
    parser.add_argument("--model", required=False, choices=list(ALLOWED_MODELS.keys()))
    parser.add_argument(
        "--db",
        default=os.getenv("DATABASE_URL", "postgresql+psycopg2://tenantflow:tenantflow@localhost:5432/tenantflow"),
    )

    args = parser.parse_args()
    result = train_and_save_model(args.tenant_id, args.db, args.model)
    print(f"Saved model to {result['model_path']}")
    print(f"Selected model: {result['model_name']}")
    print(f"Validation accuracy: {result['accuracy']:.4f}")
