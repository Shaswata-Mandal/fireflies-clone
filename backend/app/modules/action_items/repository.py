"""Action item queries only. Ownership is enforced by joining meetings.owner_id.

WHAT: Queries to list items per meeting or across all meetings, fetch one owned item, compute
    the next position, and add/delete rows.
LAYER: Repository.
CALLED BY: action_items/service.py only.
CALLS: SQLAlchemy, the ActionItem and Meeting models.
MERN EQUIVALENT: Mongoose `ActionItem.find({ meetingId }).populate('assignee')` style queries.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.action_items.models import ActionItem
from app.modules.meetings.models import Meeting

# Reused loader options: preload assignee and source segment so mapping to DTOs adds no queries.
_EAGER = (selectinload(ActionItem.assignee), selectinload(ActionItem.source_segment))


def list_by_meeting(db: Session, meeting_id: int) -> list[ActionItem]:
    """Items of one meeting in display order (no ownership check; the service did that)."""
    statement = (
        select(ActionItem)
        .where(ActionItem.meeting_id == meeting_id)
        .options(*_EAGER)
        .order_by(ActionItem.position, ActionItem.id)
    )
    return list(db.scalars(statement))


def get_owned(db: Session, owner_id: int, item_id: int) -> ActionItem | None:
    """The item, or None if it is missing or its meeting belongs to someone else."""
    # Items have no owner column; ownership comes from the meeting they belong to.
    statement = (
        select(ActionItem)
        .join(Meeting, Meeting.id == ActionItem.meeting_id)
        .where(ActionItem.id == item_id, Meeting.owner_id == owner_id)
        .options(*_EAGER)
    )
    return db.scalar(statement)


def max_position(db: Session, meeting_id: int) -> int | None:
    """Highest position used in the meeting, or None when it has no items (MAX of nothing)."""
    return db.scalar(
        select(func.max(ActionItem.position)).where(ActionItem.meeting_id == meeting_id)
    )


def existing_texts(db: Session, meeting_id: int) -> list[str]:
    """Every item text in the meeting (used to skip duplicates when appending generated items)."""
    return list(db.scalars(select(ActionItem.text).where(ActionItem.meeting_id == meeting_id)))


def list_for_owner(
    db: Session, owner_id: int, *, completed: bool | None, page: int, limit: int
) -> tuple[list[tuple[ActionItem, str]], int]:
    """One page of `(item, meeting_title)` across the owner's meetings, newest first.

    Args:
        db: the session.
        owner_id: only this user's meetings are included.
        completed: True/False to filter by status, None for all.
        page: 1-based page number.
        limit: page size.
    Returns:
        (rows, total) where each row is (ActionItem, title of its meeting).
    """
    conditions = [Meeting.owner_id == owner_id]
    if completed is not None:
        # `.is_(x)` compiles to `IS TRUE` / `IS FALSE`, the right way to compare booleans in SQL.
        conditions.append(ActionItem.is_completed.is_(completed))
    base = select(ActionItem).join(Meeting, Meeting.id == ActionItem.meeting_id).where(*conditions)

    # Count by wrapping the filtered query as a subquery, so the count shares the same WHERE.
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    statement = (
        # `add_columns` returns the meeting title next to each item, avoiding a lookup per row.
        base.add_columns(Meeting.title)
        .options(*_EAGER)
        # id DESC breaks ties so pages are stable when many items share a created_at.
        .order_by(ActionItem.created_at.desc(), ActionItem.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return [(item, title) for item, title in db.execute(statement)], total


def add(db: Session, item: ActionItem) -> None:
    """Add and flush (never commit): the service owns the transaction."""
    db.add(item)
    db.flush()


def delete(db: Session, item: ActionItem) -> None:
    """Mark the item for deletion; the service's `commit()` runs the DELETE."""
    db.delete(item)
