"""Action item queries only. Ownership is enforced by joining meetings.owner_id."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.action_items.models import ActionItem
from app.modules.meetings.models import Meeting

_EAGER = (selectinload(ActionItem.assignee), selectinload(ActionItem.source_segment))


def list_by_meeting(db: Session, meeting_id: int) -> list[ActionItem]:
    statement = (
        select(ActionItem)
        .where(ActionItem.meeting_id == meeting_id)
        .options(*_EAGER)
        .order_by(ActionItem.position, ActionItem.id)
    )
    return list(db.scalars(statement))


def get_owned(db: Session, owner_id: int, item_id: int) -> ActionItem | None:
    """The item, or None if it is missing or its meeting belongs to someone else."""
    statement = (
        select(ActionItem)
        .join(Meeting, Meeting.id == ActionItem.meeting_id)
        .where(ActionItem.id == item_id, Meeting.owner_id == owner_id)
        .options(*_EAGER)
    )
    return db.scalar(statement)


def max_position(db: Session, meeting_id: int) -> int | None:
    return db.scalar(
        select(func.max(ActionItem.position)).where(ActionItem.meeting_id == meeting_id)
    )


def existing_texts(db: Session, meeting_id: int) -> list[str]:
    return list(db.scalars(select(ActionItem.text).where(ActionItem.meeting_id == meeting_id)))


def list_for_owner(
    db: Session, owner_id: int, *, completed: bool | None, page: int, limit: int
) -> tuple[list[tuple[ActionItem, str]], int]:
    """One page of `(item, meeting_title)` across the owner's meetings, newest first."""
    conditions = [Meeting.owner_id == owner_id]
    if completed is not None:
        conditions.append(ActionItem.is_completed.is_(completed))
    base = select(ActionItem).join(Meeting, Meeting.id == ActionItem.meeting_id).where(*conditions)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    statement = (
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
    db.delete(item)
