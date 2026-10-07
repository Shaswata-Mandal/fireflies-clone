"""Summary and chapter queries only.

WHAT: Queries to fetch a meeting's summary and chapters, replace chapters, and insert rows.
LAYER: Repository.
CALLED BY: summaries/service.py only.
CALLS: SQLAlchemy, the Summary and Chapter models.
MERN EQUIVALENT: Mongoose `Summary.findOne({ meetingId })` and `Chapter.deleteMany(...)`.
"""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.summaries.models import Chapter, Summary


def get_by_meeting(db: Session, meeting_id: int) -> Summary | None:
    """The meeting's summary, or None if it has none yet."""
    return db.scalar(select(Summary).where(Summary.meeting_id == meeting_id))


def list_chapters(db: Session, meeting_id: int) -> list[Chapter]:
    """Chapters of a meeting in outline order."""
    statement = select(Chapter).where(Chapter.meeting_id == meeting_id).order_by(Chapter.position)
    return list(db.scalars(statement))


def delete_chapters(db: Session, meeting_id: int) -> None:
    """Bulk delete and flush: the new chapters reuse positions under UNIQUE(meeting_id, position),
    so the old rows must be gone before the inserts run."""
    # A bulk `delete()` statement runs one DELETE ... WHERE, without loading rows into Python.
    db.execute(delete(Chapter).where(Chapter.meeting_id == meeting_id))
    db.flush()


# `*rows` collects any number of arguments into a tuple (like JS rest params `...rows`).
def add(db: Session, *rows: Summary | Chapter) -> None:
    """Add and flush (never commit): the service owns the transaction."""
    db.add_all(rows)
    db.flush()
