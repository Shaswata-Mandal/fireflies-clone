"""HTTP layer for the transcript: parse the request, call one service function, return it."""

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.transcripts import service
from app.modules.transcripts.schemas import SegmentRead, SegmentUpdate, TranscriptRead

router = APIRouter(tags=["transcripts"])


@router.get("/meetings/{meeting_id}/transcript", response_model=TranscriptRead)
def get_transcript(meeting_id: int, db: DbSession, user: CurrentUser) -> TranscriptRead:
    return service.get_transcript(db, user, meeting_id)


@router.patch("/transcript-segments/{segment_id}", response_model=SegmentRead)
def update_segment(
    segment_id: int, body: SegmentUpdate, db: DbSession, user: CurrentUser
) -> SegmentRead:
    return SegmentRead.model_validate(service.update_segment(db, user, segment_id, body))
