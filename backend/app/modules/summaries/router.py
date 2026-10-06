"""HTTP layer for /meetings/{id}/summary."""

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.meetings.schemas import SummaryRead
from app.modules.summaries import service
from app.modules.summaries.schemas import (
    SummaryGenerateRequest,
    SummaryGenerateResponse,
    SummaryUpdate,
)

router = APIRouter(prefix="/meetings/{meeting_id}/summary", tags=["summaries"])


@router.post("/generate", response_model=SummaryGenerateResponse)
def generate_summary(
    meeting_id: int, db: DbSession, user: CurrentUser, body: SummaryGenerateRequest | None = None
) -> SummaryGenerateResponse:
    return service.generate_summary(db, user, meeting_id, body or SummaryGenerateRequest())


@router.patch("", response_model=SummaryRead)
def update_summary(
    meeting_id: int, body: SummaryUpdate, db: DbSession, user: CurrentUser
) -> SummaryRead:
    return service.update_summary(db, user, meeting_id, body)
