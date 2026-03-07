"""Expose FastAPI app at `app.main:app` from repository root."""

from backend.app.main import app

__all__ = ["app"]
