"""Meeting queries only: no business decisions. Every read is scoped to the owner.

WHAT: SQLAlchemy queries for meetings: filtered/sorted/paginated list, fetch one, add, delete.
LAYER: Repository (talks to the DB, decides nothing).
CALLED BY: meetings/service.py only.
CALLS: SQLAlchemy `select`, the Meeting models, core/sql helpers.
MERN EQUIVALENT: the Mongoose query code (`Meeting.find({...}).sort().skip().limit().populate()`)
    that you would normally keep in a DAO or inline in a controller.
"""

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
# INTERVIEW: protects against SQL injection through the sort parameter, and prevents duplicate or
# missing rows across pages when many meetings share the same sort value.
_SORT_ORDER = {
    MeetingSort.DATE_DESC: (Meeting.meeting_date.desc(), Meeting.id.desc()),
    MeetingSort.DATE_ASC: (Meeting.meeting_date.asc(), Meeting.id.desc()),
    MeetingSort.TITLE_ASC: (func.lower(Meeting.title).asc(), Meeting.id.desc()),
    MeetingSort.DURATION_DESC: (Meeting.duration_ms.desc(), Meeting.id.desc()),
}


# `frozen=True` makes instances immutable, so a filters object can't be changed by accident.
# `@dataclass` generates `__init__` from the annotated fields (like a TS interface with a ctor).
@dataclass(frozen=True)
class MeetingFilters:
    """The optional filters for the library list; None means "don't filter on this"."""

    q: str | None = None
    participant_id: int | None = None
    date_from: date | None = None  # inclusive lower bound (whole UTC day)
    date_to: date | None = None  # inclusive upper bound (whole UTC day)
    tag_id: int | None = None


def _day_start(day: date) -> datetime:
    """Midnight UTC at the start of `day` (a timezone-aware datetime the DB column accepts)."""
    return datetime.combine(day, time.min, tzinfo=UTC)


def _conditions(owner_id: int, filters: MeetingFilters) -> list[ColumnElement[bool]]:
    """Turn the filters into a list of SQL WHERE conditions (ANDed together by the caller).

    Args:
        owner_id: only this user's meetings are ever matched (tenant isolation).
        filters: the optional search/participant/tag/date filters.
    Returns:
        A list of SQLAlchemy boolean expressions. Used for both the page query and the count.
    Why it exists: one place builds the WHERE clause so the total and the page always agree.
    """
    conditions: list[ColumnElement[bool]] = [Meeting.owner_id == owner_id]
    if filters.q:
        pattern = f"%{escape_like(filters.q)}%"
        # `ilike` = case-insensitive LIKE; `escape=` tells SQL which character escapes wildcards.
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
    """One page of `(meeting, open_action_item_count)` plus the total of all filtered rows.

    Args:
        db: the request's session.
        owner_id: whose meetings to list.
        filters: optional filters.
        sort: a whitelisted sort key.
        page: 1-based page number.
        limit: page size.
    Returns:
        (rows, total), where rows is a list of (Meeting, open_items) tuples.
    """
    conditions = _conditions(owner_id, filters)
    # `db.scalar` returns the first column of the first row; `or 0` covers a None result.
    total = db.scalar(select(func.count()).select_from(Meeting).where(*conditions)) or 0

    # Correlated scalar subquery: the count is computed inside the page query, not per meeting.
    # INTERVIEW: avoids an N+1 (one extra query per meeting) for the "open items" badge.
    open_items = (
        select(func.count(ActionItem.id))
        .where(ActionItem.meeting_id == Meeting.id, ActionItem.is_completed.is_(False))
        .correlate(Meeting)
        .scalar_subquery()
    )
    statement = (
        select(Meeting, open_items)
        .where(*conditions)
        # `selectinload` = Mongoose `populate()`: one extra batched `WHERE id IN (...)` query per
        # relationship instead of one query per meeting (the N+1 problem).
        .options(
            selectinload(Meeting.participant_links).selectinload(MeetingParticipant.participant),
            selectinload(Meeting.tags),
            selectinload(Meeting.summary),
        )
        .order_by(*_SORT_ORDER[sort])
        # Classic offset pagination: skip the previous pages, then take one page.
        .offset((page - 1) * limit)
        .limit(limit)
    )
    rows = [(meeting, int(count)) for meeting, count in db.execute(statement)]
    return rows, total


def get_owned(db: Session, owner_id: int, meeting_id: int) -> Meeting | None:
    """Meeting with everything MeetingDetail needs; None if missing or owned by someone else.

    Args:
        db: the request's session.
        owner_id: the requesting user's id (the ownership check lives in the WHERE clause).
        meeting_id: the meeting to load.
    Returns:
        The Meeting with participants, tags, summary and chapters preloaded, or None.
    """
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
    """Add and flush (never commit): the service owns the transaction.

    `flush()` sends the INSERTs now so ids are assigned, but the transaction stays open and can
    still be rolled back.
    """
    db.add(meeting)
    db.flush()


def delete(db: Session, meeting: Meeting) -> None:
    """Mark the meeting for deletion; the service's `commit()` actually runs the DELETE."""
    db.delete(meeting)
