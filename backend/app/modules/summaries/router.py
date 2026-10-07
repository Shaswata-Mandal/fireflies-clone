"""HTTP layer for /meetings/{id}/summary.

WHAT: Endpoints to (re)generate a meeting's summary and to edit it by hand.
LAYER: Router.
CALLED BY: main.py (under /api/v1); the frontend's summary module.
CALLS: summaries/service.py.
MERN EQUIVALENT: Express routes `POST /meetings/:id/summary/generate` and
    `PATCH /meetings/:id/summary`.
"""

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.meetings.schemas import SummaryRead
from app.modules.summaries import service
from app.modules.summaries.schemas import (
    SummaryGenerateRequest,
    SummaryGenerateResponse,
    SummaryUpdate,
)

# `{meeting_id}` in the router prefix applies to every route in this file.
router = APIRouter(prefix="/meetings/{meeting_id}/summary", tags=["summaries"])


@router.post("/generate", response_model=SummaryGenerateResponse)
def generate_summary(
    meeting_id: int, db: DbSession, user: CurrentUser, body: SummaryGenerateRequest | None = None
) -> SummaryGenerateResponse:
    """POST .../summary/generate: regenerate summary + chapters (body is optional)."""
    # `body or SummaryGenerateRequest()` supplies the defaults when the client sends no body.
    return service.generate_summary(db, user, meeting_id, body or SummaryGenerateRequest())


@router.patch("", response_model=SummaryRead)
def update_summary(
    meeting_id: int, body: SummaryUpdate, db: DbSession, user: CurrentUser
) -> SummaryRead:
    """PATCH .../summary: manually edit overview, bullet points or keywords."""
    return service.update_summary(db, user, meeting_id, body)
