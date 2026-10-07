"""Transcript business rules.

WHAT: Reading a meeting's segments, editing one segment, and listing segments across recent
    meetings. Always checks that the user owns the meeting.
LAYER: Service.
CALLED BY: transcripts/router.py, summaries/service.py (segments to summarise), ask/service.py
    (segments as context for questions), exports.
CALLS: transcripts/repository.py and meetings/service.py (ownership check).
MERN EQUIVALENT: a `transcriptService.js` that wraps model calls with ownership checks.
"""

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.modules.meetings import service as meetings_service
from app.modules.transcripts import repository
from app.modules.transcripts.models import TranscriptSegment
from app.modules.transcripts.schemas import SegmentRead, SegmentUpdate, TranscriptRead
from app.modules.users.models import User


def list_segments(db: Session, owner: User, meeting_id: int) -> list[TranscriptSegment]:
    """Segments in position order; MEETING_NOT_FOUND if the meeting isn't the owner's."""
    # Called for its side effect: it raises 404 when the meeting is missing or not owned.
    meetings_service.get_owned_or_404(db, owner, meeting_id)
    return repository.list_by_meeting(db, meeting_id)


def get_transcript(db: Session, owner: User, meeting_id: int) -> TranscriptRead:
    """Return the transcript DTO for a meeting the user owns."""
    segments = list_segments(db, owner, meeting_id)
    return TranscriptRead(
        meeting_id=meeting_id, segments=[SegmentRead.model_validate(s) for s in segments]
    )


def update_segment(
    db: Session, owner: User, segment_id: int, data: SegmentUpdate
) -> TranscriptSegment:
    """Fix a transcription error. participant_id is left alone: relabelling a speaker is a display
    edit, not a re-identification of who spoke.

    Args:
        db: the request's session.
        owner: the current user.
        segment_id: which segment to edit.
        data: PATCH body (None fields were not sent).
    Returns:
        The updated ORM segment.
    """
    segment = repository.get_owned(db, owner.id, segment_id)
    if segment is None:
        # Someone else's segment looks exactly like a missing one.
        raise NotFoundError("SEGMENT_NOT_FOUND", f"Transcript segment {segment_id} not found")
    if data.text is not None:
        segment.text = data.text
    if data.speaker_label is not None:
        segment.speaker_label = data.speaker_label
    # Changing loaded attributes is enough; commit makes the session emit the UPDATE.
    db.commit()
    return segment


def list_recent_segments(db: Session, owner: User, meeting_limit: int) -> list[TranscriptSegment]:
    """Segments across the owner's newest meetings (never anyone else's)."""
    return repository.list_recent_owned(db, owner.id, meeting_limit)
