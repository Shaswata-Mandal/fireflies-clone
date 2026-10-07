"""Health endpoints. Outside /api/v1 on purpose: they serve hosts and smoke tests, not clients."""

from fastapi import APIRouter, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.deps import DbSession
from app.core.exceptions import AppException

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness only: touches nothing, so the host's frequent checks stay cheap."""
    return {"status": "ok"}


@router.get("/health/db")
def health_db(db: DbSession) -> dict[str, str]:
    """Readiness: proves the database file opens and answers. A read, never a write."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise AppException(
            "DB_UNAVAILABLE", "Database is unavailable", status.HTTP_503_SERVICE_UNAVAILABLE
        ) from exc
    return {"status": "ok"}
