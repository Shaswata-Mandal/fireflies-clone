"""Meeting queries only: no business decisions. Every read is scoped to the owner."""

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.sql import LIKE_ESCAPE_CHAR, escape_like
from app.modules.action_items.models import ActionItem
from app.modules.meetings.models import Meeting, MeetingParticipant, meeting_tags
from app.modules.meetings.schemas import MeetingSort

# Whitelist: user input only ever selects a key here, it is never interpolated into ORDER BY.
# `id DESC` is a tiebreaker so equal values paginate deterministically.
_SORT_ORDER = {
    MeetingSort.DATE_DESC: (Meeting.meeting_date.desc(), Meeting.id.desc()),
    MeetingSort.DATE_ASC: (Meeting.meeting_date.asc(), Meeting.id.desc()),
    MeetingSort.TITLE_ASC: (func.lower(Meeting.title).asc(), Meeting.id.desc()),
    MeetingSort.DURATION_DESC: (Meeting.duration_ms.desc(), Meeting.id.desc()),
}


@dataclass(frozen=True)
class MeetingFilters:
    q: str | None = None
    participant_id: int | None = None
    date_from: date | None = None  # inclusive lower bound (whole UTC day)
    date_to: date | None = None  # inclusive upper bound (whole UTC day)
    tag_id: int | None = None


def _day_start(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=UTC)


def _conditions(owner_id: int, filters: MeetingFilters) -> list[ColumnElement[bool]]:
    conditions: list[ColumnElement[bool]] = [Meeting.owner_id == owner_id]
    if filters.q:
        pattern = f"%{escape_like(filters.q)}%"
        conditions.append(Meeting.title.ilike(pattern, escape=LIKE_ESCAPE_CHAR))
    if filters.participant_id is not None:
        # EXISTS rather than JOIN: a join could return a meeting twice and inflate `total`.
        conditions.append(
            select(MeetingParticipant.meeting_id)
            .where(
                MeetingParticipant.meeting_id == Meeting.id,
                MeetingParticipant.participant_id == filters.participant_id,
            )
            .exists()
        )
    if filters.tag_id is not None:
        conditions.append(
            select(meeting_tags.c.meeting_id)
            .where(meeting_tags.c.meeting_id == Meeting.id, meeting_tags.c.tag_id == filters.tag_id)
            .exists()
        )
    if filters.date_from is not None:
        conditions.append(Meeting.meeting_date >= _day_start(filters.date_from))
    if filters.date_to is not None:
        # Whole day inclusive = strictly before the start of the next day.
        conditions.append(Meeting.meeting_date < _day_start(filters.date_to) + timedelta(days=1))
    return conditions


def list_filtered(
    db: Session,
    owner_id: int,
    filters: MeetingFilters,
    sort: MeetingSort,
    page: int,
    limit: int,
) -> tuple[list[tuple[Meeting, int]], int]:
    """One page of `(meeting, open_action_item_count)` plus the total of all filtered rows."""
    conditions = _conditions(owner_id, filters)
    total = db.scalar(select(func.count()).select_from(Meeting).where(*conditions)) or 0

    # Correlated scalar subquery: the count is computed inside the page query, not per meeting.
    open_items = (
        select(func.count(ActionItem.id))
        .where(ActionItem.meeting_id == Meeting.id, ActionItem.is_completed.is_(False))
        .correlate(Meeting)
        .scalar_subquery()
    )
    statement = (
        select(Meeting, open_items)
        .where(*conditions)
        .options(
            selectinload(Meeting.participant_links).selectinload(MeetingParticipant.participant),
            selectinload(Meeting.tags),
            selectinload(Meeting.summary),
        )
        .order_by(*_SORT_ORDER[sort])
        .offset((page - 1) * limit)
        .limit(limit)
    )
    rows = [(meeting, int(count)) for meeting, count in db.execute(statement)]
    return rows, total


def get_owned(db: Session, owner_id: int, meeting_id: int) -> Meeting | None:
    """Meeting with everything MeetingDetail needs; None if missing or owned by someone else."""
    statement = (
        select(Meeting)
        .where(Meeting.id == meeting_id, Meeting.owner_id == owner_id)
        .options(
            selectinload(Meeting.participant_links).selectinload(MeetingParticipant.participant),
            selectinload(Meeting.tags),
            selectinload(Meeting.summary),
            selectinload(Meeting.chapters),
        )
    )
    return db.scalar(statement)


def add(db: Session, meeting: Meeting) -> None:
    """Add and flush (never commit): the service owns the transaction."""
    db.add(meeting)
    db.flush()


def delete(db: Session, meeting: Meeting) -> None:
    db.delete(meeting)
