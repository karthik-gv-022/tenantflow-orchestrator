import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def _default_database_url() -> str:
    # Docker containers can resolve the compose service name `postgres`.
    host = "postgres" if os.path.exists("/.dockerenv") else "localhost"
    return f"postgresql+psycopg2://tenantflow:tenantflow@{host}:5432/tenantflow"


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    _default_database_url(),
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
