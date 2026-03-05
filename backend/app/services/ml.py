from __future__ import annotations

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score


class DelayPredictionService:
    def __init__(self) -> None:
        self.model = LogisticRegression(max_iter=500)
        self._trained = False
        self.metrics = {"accuracy": 0.0, "precision": 0.0, "recall": 0.0}

    def feature_engineering(
        self,
        complexity_score: float,
        workload_count: int,
        past_delay_count: int,
        average_completion_time: float,
    ) -> np.ndarray:
        load_ratio = workload_count / 10.0
        delay_ratio = past_delay_count / max(1, workload_count)
        normalized_completion_time = average_completion_time / 72.0
        return np.array(
            [[complexity_score, load_ratio, delay_ratio, normalized_completion_time]],
            dtype=float,
        )

    def train_model(self) -> None:
        if self._trained:
            return

        X = np.array(
            [
                [0.2, 0.1, 0.0, 0.2],
                [0.4, 0.2, 0.1, 0.3],
                [0.6, 0.4, 0.3, 0.5],
                [0.8, 0.7, 0.6, 0.8],
                [0.9, 0.8, 0.7, 0.9],
                [0.3, 0.2, 0.2, 0.3],
                [0.7, 0.6, 0.5, 0.7],
                [0.5, 0.3, 0.4, 0.6],
            ]
        )
        y = np.array([0, 0, 0, 1, 1, 0, 1, 1])

        self.model.fit(X, y)

        y_pred = self.model.predict(X)
        self.metrics = {
            "accuracy": float(accuracy_score(y, y_pred)),
            "precision": float(precision_score(y, y_pred, zero_division=0)),
            "recall": float(recall_score(y, y_pred, zero_division=0)),
        }
        self._trained = True

    def predict_delay_probability(self, features: np.ndarray) -> float:
        self.train_model()
        probability = self.model.predict_proba(features)[0][1]
        return float(probability)

    @staticmethod
    def risk_level(probability: float) -> str:
        if probability >= 0.8:
            return "critical"
        if probability >= 0.6:
            return "high"
        if probability >= 0.35:
            return "medium"
        return "low"


ml_service = DelayPredictionService()
