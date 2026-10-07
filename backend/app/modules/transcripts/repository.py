"""Transcript segment queries only.

WHAT: SQLAlchemy queries for segments: all in a meeting, one owned by a user, and the segments of
    a user's most recent meetings (feeds the "ask" feature).
LAYER: Repository.
CALLED BY: transcripts/service.py only.
CALLS: SQLAlchemy `select`, the Meeting and TranscriptSegment models.
MERN EQUIVALENT: Mongoose queries such as `Segment.find({ meetingId }).sort('position')`.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.modules.meetings.models import Meeting
from app.modules.transcripts.models import TranscriptSegment


def list_by_meeting(db: Session, meeting_id: int) -> list[TranscriptSegment]:
    """All segments of one meeting in spoken order (no ownership check; the service did that)."""
    statement = (
        select(TranscriptSegment)
        .where(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.position)
    )
    return list(db.scalars(statement))


def get_owned(db: Session, owner_id: int, segment_id: int) -> TranscriptSegment | None:
    """The segment, or None if it is missing or its meeting belongs to someone else."""
    # Segments have no owner column, so ownership is checked by joining to the parent meeting.
    statement = (
        select(TranscriptSegment)
        .join(Meeting, Meeting.id == TranscriptSegment.meeting_id)
        .where(TranscriptSegment.id == segment_id, Meeting.owner_id == owner_id)
    )
    return db.scalar(statement)


def list_recent_owned(db: Session, owner_id: int, meeting_limit: int) -> list[TranscriptSegment]:
    """Segments of the owner's `meeting_limit` newest meetings: newest meeting first, then in
    spoken order. Each segment's meeting is loaded in the same query (needed for titles).

    Args:
        db: the session.
        owner_id: whose meetings to read.
        meeting_limit: how many of the newest meetings to include.
    Returns:
        Segments with `.meeting` already loaded.
    """
    # A subquery that yields the ids of the N newest meetings; used in the `IN (...)` below.
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
        # `joinedload` = fetch the parent in the same SELECT via a JOIN (fine for many-to-one;
        # `selectinload` is used for one-to-many lists).
        .options(joinedload(TranscriptSegment.meeting))
        .order_by(Meeting.meeting_date.desc(), Meeting.id.desc(), TranscriptSegment.position)
    )
    return list(db.scalars(statement))
