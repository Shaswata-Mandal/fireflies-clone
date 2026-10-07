"""HTTP layer for the transcript: parse the request, call one service function, return it.

WHAT: Endpoints to read a meeting's transcript and to correct one segment.
LAYER: Router.
CALLED BY: main.py (under /api/v1); the frontend's transcript module.
CALLS: transcripts/service.py.
MERN EQUIVALENT: Express routes `GET /meetings/:id/transcript` and
    `PATCH /transcript-segments/:id`.
"""

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.transcripts import service
from app.modules.transcripts.schemas import SegmentRead, SegmentUpdate, TranscriptRead

# No prefix: the two routes live under different path roots, so full paths are written below.
router = APIRouter(tags=["transcripts"])


@router.get("/meetings/{meeting_id}/transcript", response_model=TranscriptRead)
def get_transcript(meeting_id: int, db: DbSession, user: CurrentUser) -> TranscriptRead:
    """GET /meetings/{id}/transcript: every segment in spoken order."""
    return service.get_transcript(db, user, meeting_id)


@router.patch("/transcript-segments/{segment_id}", response_model=SegmentRead)
def update_segment(
    segment_id: int, body: SegmentUpdate, db: DbSession, user: CurrentUser
) -> SegmentRead:
    """PATCH /transcript-segments/{id}: fix the text or speaker label of one segment."""
    # The service returns an ORM object, so convert it to the response model here.
    return SegmentRead.model_validate(service.update_segment(db, user, segment_id, body))
