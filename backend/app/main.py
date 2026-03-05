import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import analytics, auth, tasks, tenants, users

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("tenantflow.backend")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TenantFlow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tenants.router)
app.include_router(tasks.router)
app.include_router(analytics.router)


@app.get("/")
def healthcheck():
    logger.info("Healthcheck requested")
    return {"status": "ok"}
