import logging
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import analytics, auth, ml, tasks, tenants, users

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("tenantflow.backend")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"
FRONTEND_ASSETS_DIR = FRONTEND_DIST_DIR / "assets"
INDEX_FILE = FRONTEND_DIST_DIR / "index.html"
API_PREFIXES = ("auth", "tasks", "analytics", "predict-delay", "users", "tenants", "federated")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TenantFlow API", version="1.0.0")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_DEVELOPMENT = ENVIRONMENT != "production"

cors_kwargs = {
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

if IS_DEVELOPMENT:
    cors_kwargs.update(
        {
            "allow_origins": ["*"],
            "allow_credentials": False,
        }
    )
else:
    cors_kwargs.update(
        {
            "allow_origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
            "allow_credentials": True,
        }
    )

app.add_middleware(
    CORSMiddleware,
    **cors_kwargs,
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tenants.router)
app.include_router(tasks.router)
app.include_router(analytics.router)
app.include_router(ml.router)


app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS_DIR, check_dir=False), name="assets")


def _ensure_frontend_build() -> None:
    if not INDEX_FILE.exists():
        raise HTTPException(
            status_code=503,
            detail="Frontend build not found. Run `npm install && npm run build` in the frontend directory.",
        )


@app.get("/health")
def healthcheck():
    logger.info("Healthcheck requested")
    return {"status": "ok"}


@app.get("/")
def serve_frontend_root():
    _ensure_frontend_build()
    return FileResponse(INDEX_FILE)


@app.get("/{full_path:path}")
def serve_frontend_app(full_path: str):
    normalized_path = full_path.strip("/")
    if normalized_path:
        first_segment = normalized_path.split("/", 1)[0]
        if first_segment in API_PREFIXES:
            raise HTTPException(status_code=404, detail="Not Found")

    _ensure_frontend_build()
    return FileResponse(INDEX_FILE)
