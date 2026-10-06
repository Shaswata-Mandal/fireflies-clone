"""Transcript business rules."""

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.modules.meetings import service as meetings_service
from app.modules.transcripts import repository
from app.modules.transcripts.models import TranscriptSegment
from app.modules.transcripts.schemas import SegmentRead, SegmentUpdate, TranscriptRead
from app.modules.users.models import User


def list_segments(db: Session, owner: User, meeting_id: int) -> list[TranscriptSegment]:
    """Segments in position order; MEETING_NOT_FOUND if the meeting isn't the owner's."""
    meetings_service.get_owned_or_404(db, owner, meeting_id)
    return repository.list_by_meeting(db, meeting_id)


def get_transcript(db: Session, owner: User, meeting_id: int) -> TranscriptRead:
    segments = list_segments(db, owner, meeting_id)
    return TranscriptRead(
        meeting_id=meeting_id, segments=[SegmentRead.model_validate(s) for s in segments]
    )


def update_segment(
    db: Session, owner: User, segment_id: int, data: SegmentUpdate
) -> TranscriptSegment:
    """Fix a transcription error. participant_id is left alone: relabelling a speaker is a display
    edit, not a re-identification of who spoke."""
    segment = repository.get_owned(db, owner.id, segment_id)
    if segment is None:
        # Someone else's segment looks exactly like a missing one.
        raise NotFoundError("SEGMENT_NOT_FOUND", f"Transcript segment {segment_id} not found")
    if data.text is not None:
        segment.text = data.text
    if data.speaker_label is not None:
        segment.speaker_label = data.speaker_label
    db.commit()
    return segment
