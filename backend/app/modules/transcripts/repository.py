"""Transcript segment queries only."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.meetings.models import Meeting
from app.modules.transcripts.models import TranscriptSegment


def list_by_meeting(db: Session, meeting_id: int) -> list[TranscriptSegment]:
    statement = (
        select(TranscriptSegment)
        .where(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.position)
    )
    return list(db.scalars(statement))


def get_owned(db: Session, owner_id: int, segment_id: int) -> TranscriptSegment | None:
    """The segment, or None if it is missing or its meeting belongs to someone else."""
    statement = (
        select(TranscriptSegment)
        .join(Meeting, Meeting.id == TranscriptSegment.meeting_id)
        .where(TranscriptSegment.id == segment_id, Meeting.owner_id == owner_id)
    )
    return db.scalar(statement)
