"""Transcript segment queries only."""

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

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


def list_recent_owned(db: Session, owner_id: int, meeting_limit: int) -> list[TranscriptSegment]:
    """Segments of the owner's `meeting_limit` newest meetings: newest meeting first, then in
    spoken order. Each segment's meeting is loaded in the same query (needed for titles)."""
    recent_meeting_ids = (
        select(Meeting.id)
        .where(Meeting.owner_id == owner_id)
        .order_by(Meeting.meeting_date.desc(), Meeting.id.desc())
        .limit(meeting_limit)
    )
    statement = (
        select(TranscriptSegment)
        .join(Meeting, Meeting.id == TranscriptSegment.meeting_id)
        .where(TranscriptSegment.meeting_id.in_(recent_meeting_ids))
        .options(joinedload(TranscriptSegment.meeting))
        .order_by(Meeting.meeting_date.desc(), Meeting.id.desc(), TranscriptSegment.position)
    )
    return list(db.scalars(statement))
