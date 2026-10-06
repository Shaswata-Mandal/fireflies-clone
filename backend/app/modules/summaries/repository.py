"""Summary and chapter queries only."""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.summaries.models import Chapter, Summary


def get_by_meeting(db: Session, meeting_id: int) -> Summary | None:
    return db.scalar(select(Summary).where(Summary.meeting_id == meeting_id))


def list_chapters(db: Session, meeting_id: int) -> list[Chapter]:
    statement = select(Chapter).where(Chapter.meeting_id == meeting_id).order_by(Chapter.position)
    return list(db.scalars(statement))


def delete_chapters(db: Session, meeting_id: int) -> None:
    """Bulk delete and flush: the new chapters reuse positions under UNIQUE(meeting_id, position),
    so the old rows must be gone before the inserts run."""
    db.execute(delete(Chapter).where(Chapter.meeting_id == meeting_id))
    db.flush()


def add(db: Session, *rows: Summary | Chapter) -> None:
    """Add and flush (never commit): the service owns the transaction."""
    db.add_all(rows)
    db.flush()
