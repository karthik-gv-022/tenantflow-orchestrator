import pandas as pd
from typing import Tuple, List

FEATURE_COLUMNS = [
    "past_completion_time",
    "task_type",
    "assigned_role",
    "current_workload",
]


def prepare_training_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
    df = df.copy()
    X = df[FEATURE_COLUMNS]
    X = pd.get_dummies(X, columns=["task_type", "assigned_role"], drop_first=False)
    y = df["actual_delay"].astype(int)
    feature_columns = list(X.columns)
    return X, y, feature_columns


def prepare_features_for_prediction(features: dict, feature_columns: List[str]) -> pd.DataFrame:
    df = pd.DataFrame([features])
    df = pd.get_dummies(df, columns=["task_type", "assigned_role"], drop_first=False)
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0
    df = df[feature_columns]
    return df
