"""Action item business rules: ownership, assignee validation, position and completed_at.

WHAT: Create, list, edit (including completion), append generated items without duplicates, and
    delete action items.
LAYER: Service.
CALLED BY: action_items/router.py; summaries/service.py (`append_generated`); exports.
CALLS: action_items/repository.py, meetings/service.py (ownership), participants/service.py
    (assignee check).
MERN EQUIVALENT: a `todoService.js` with ownership checks and "toggle done" rules.
"""

from sqlalchemy.orm import Session

from app.core.db_types import utcnow
from app.core.exceptions import NotFoundError, ValidationError
from app.modules.action_items import repository
from app.modules.action_items.models import ActionItem
from app.modules.action_items.schemas import (
    ActionItemCreate,
    ActionItemPage,
    ActionItemRead,
    ActionItemStatus,
    ActionItemUpdate,
    ActionItemWithMeeting,
    AssigneeBrief,
)
from app.modules.meetings import service as meetings_service
from app.modules.participants import service as participants_service
from app.modules.users.models import User


def _fields(item: ActionItem) -> dict[str, object]:
    """Flatten an ORM item into the dict of fields shared by both read DTOs.

    Why it exists: `ActionItemRead` and `ActionItemWithMeeting` need the same fields, so the
    mapping lives once here (DRY).
    """
    return {
        "id": item.id,
        "meeting_id": item.meeting_id,
        "text": item.text,
        "assignee": AssigneeBrief.model_validate(item.assignee) if item.assignee else None,
        "due_date": item.due_date,
        "is_completed": item.is_completed,
        "completed_at": item.completed_at,
        "source_segment_id": item.source_segment_id,
        # Flattened from the related segment so the UI doesn't need the whole segment.
        "source_start_ms": item.source_segment.start_ms if item.source_segment else None,
        "position": item.position,
    }


def to_read(item: ActionItem) -> ActionItemRead:
    """Public mapper: ORM action item -> response DTO (also used by the router)."""
    # `**dict` unpacks keys as keyword arguments. The ignore silences a typing limitation only:
    # `_fields` returns `object` values, which the type checker can't match to each field.
    return ActionItemRead(**_fields(item))  # type: ignore[arg-type]


def _get_owned_or_404(db: Session, owner: User, item_id: int) -> ActionItem:
    """Load an item through its meeting's owner, or raise ACTION_ITEM_NOT_FOUND."""
    # Someone else's item looks exactly like a missing one, so ids can't be probed.
    item = repository.get_owned(db, owner.id, item_id)
    if item is None:
        raise NotFoundError("ACTION_ITEM_NOT_FOUND", f"Action item {item_id} not found")
    return item


def _ensure_assignee_attends(db: Session, meeting_id: int, assignee_id: int) -> None:
    """Raise a 422 unless the assignee is a participant of this meeting."""
    # INTERVIEW: a business rule the DB foreign key can't express (the person must be in THIS
    # meeting, not just exist), so the service enforces it.
    if not participants_service.is_in_meeting(db, meeting_id, assignee_id):
        raise ValidationError(
            f"Participant {assignee_id} is not a participant of meeting {meeting_id}",
            details=[{"loc": ["body", "assignee_id"], "msg": "Not a participant of this meeting"}],
        )


def list_for_meeting(db: Session, owner: User, meeting_id: int) -> list[ActionItem]:
    """Items in display order; also used by the export."""
    meetings_service.get_owned_or_404(db, owner, meeting_id)
    return repository.list_by_meeting(db, meeting_id)


def create_item(
    db: Session, owner: User, meeting_id: int, data: ActionItemCreate
) -> ActionItemRead:
    """Add a manual action item at the end of the meeting's list.

    Args:
        db: the request's session.
        owner: the current user.
        meeting_id: the meeting to add to (must be owned).
        data: validated body.
    Returns:
        The created item as a DTO.
    """
    meetings_service.get_owned_or_404(db, owner, meeting_id)
    if data.assignee_id is not None:
        _ensure_assignee_attends(db, meeting_id, data.assignee_id)
    last = repository.max_position(db, meeting_id)
    item = ActionItem(
        meeting_id=meeting_id,
        text=data.text,
        assignee_id=data.assignee_id,
        due_date=data.due_date,
        # Next free slot; 0 when the meeting has none (last is None).
        position=0 if last is None else last + 1,
    )
    try:
        repository.add(db, item)
        db.commit()
    except Exception:
        db.rollback()
        raise
    # Re-read so the assignee relationship is populated for the response.
    return to_read(_get_owned_or_404(db, owner, item.id))


def _apply_completion(item: ActionItem, is_completed: bool) -> None:
    """Stamp completed_at only when the flag actually flips, so re-sending `true` keeps the
    original completion time."""
    if is_completed == item.is_completed:
        return
    item.is_completed = is_completed
    item.completed_at = utcnow() if is_completed else None


def update_item(db: Session, owner: User, item_id: int, data: ActionItemUpdate) -> ActionItemRead:
    """Apply a partial update and return the fresh item.

    Args:
        db: the request's session.
        owner: the current user.
        item_id: which item to change.
        data: PATCH body; only fields in `model_fields_set` are applied.
    Returns:
        The updated item as a DTO.
    """
    item = _get_owned_or_404(db, owner, item_id)
    # INTERVIEW: PATCH semantics. "assignee_id" in sent + value None = unassign;
    # "assignee_id" not in sent = leave unchanged. A plain `is not None` can't tell them apart.
    sent = data.model_fields_set  # tells "not sent" apart from "sent as null"
    if "assignee_id" in sent:
        if data.assignee_id is not None:
            _ensure_assignee_attends(db, item.meeting_id, data.assignee_id)
        item.assignee_id = data.assignee_id
    if "text" in sent and data.text is not None:
        item.text = data.text
    if "due_date" in sent:
        item.due_date = data.due_date
    if "is_completed" in sent and data.is_completed is not None:
        _apply_completion(item, data.is_completed)
    item.updated_at = utcnow()
    db.commit()
    # assignee_id changed by FK: drop the stale loaded relationship before re-reading.
    db.expire(item)
    return to_read(_get_owned_or_404(db, owner, item_id))


def append_generated(
    db: Session, meeting_id: int, candidates: list[ActionItem]
) -> list[ActionItem]:
    """Append extracted items after the existing ones, skipping any whose text already exists
    (case-insensitive, trimmed) or repeats earlier in the batch. Flushes; the caller commits.

    Args:
        db: the session (the caller's transaction).
        meeting_id: the meeting that receives the items.
        candidates: unsaved items from the summary generator.
    Returns:
        The items that were actually added.
    """
    # A set gives O(1) "have I seen this?" checks; `casefold` is a stronger `lower()` for
    # case-insensitive comparison.
    seen = {text.strip().casefold() for text in repository.existing_texts(db, meeting_id)}
    last = repository.max_position(db, meeting_id)
    next_position = 0 if last is None else last + 1
    added: list[ActionItem] = []
    for item in candidates:
        key = item.text.strip().casefold()
        if key in seen:
            continue
        seen.add(key)
        item.meeting_id = meeting_id
        item.position = next_position
        next_position += 1
        repository.add(db, item)
        added.append(item)
    return added


def delete_item(db: Session, owner: User, item_id: int) -> None:
    """Delete an owned item (404 if missing or not owned)."""
    repository.delete(db, _get_owned_or_404(db, owner, item_id))
    db.commit()


def list_all(
    db: Session, owner: User, *, status: ActionItemStatus | None, page: int, limit: int
) -> ActionItemPage:
    """One page of the owner's items across all meetings, optionally filtered by status.

    Args:
        db: the request's session.
        owner: the current user.
        status: OPEN, COMPLETED or None for all (keyword-only).
        page, limit: pagination.
    Returns:
        A paginated envelope whose rows also carry their meeting's title.
    """
    # `is` compares enum identity; maps status -> True/False/None for the repository's filter.
    completed = None if status is None else status is ActionItemStatus.COMPLETED
    rows, total = repository.list_for_owner(
        db, owner.id, completed=completed, page=page, limit=limit
    )
    items = [
        ActionItemWithMeeting(**_fields(item), meeting_title=title)  # type: ignore[arg-type]
        for item, title in rows
    ]
    return ActionItemPage(items=items, total=total, page=page, limit=limit)
