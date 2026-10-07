"""Health endpoints. Outside /api/v1 on purpose: they serve hosts and smoke tests, not clients.

WHAT: Two tiny routes the hosting platform (Render) and scripts/smoke.py ping to see if we're up.
LAYER: Router, but with no service/repository because there is no business logic.
CALLED BY: main.py includes this router; Render health checks call GET /health.
CALLS: the DB session dependency; raises AppException to reuse the standard error envelope.
MERN EQUIVALENT: `app.get('/health', (req, res) => res.json({ status: 'ok' }))`.
"""

from fastapi import APIRouter, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.deps import DbSession
from app.core.exceptions import AppException

# `tags` only groups these routes in the /docs UI. This is the equivalent of `express.Router()`.
router = APIRouter(tags=["health"])


# The decorator registers the function for GET /health. The `-> dict[str, str]` return hint lets
# FastAPI build the response schema automatically.
@router.get("/health")
def health() -> dict[str, str]:
    """Liveness only: touches nothing, so the host's frequent checks stay cheap."""
    return {"status": "ok"}


@router.get("/health/db")
def health_db(db: DbSession) -> dict[str, str]:
    """Readiness: proves the database file opens and answers. A read, never a write.

    Args:
        db: injected per-request session.
    Returns:
        {"status": "ok"}, or a 503 error envelope if the query fails.
    """
    try:
        # `text(...)` marks a raw SQL string; SELECT 1 is the cheapest possible round trip.
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        # `from exc` keeps the original error attached in logs (exception chaining).
        raise AppException(
            "DB_UNAVAILABLE", "Database is unavailable", status.HTTP_503_SERVICE_UNAVAILABLE
        ) from exc
    return {"status": "ok"}
