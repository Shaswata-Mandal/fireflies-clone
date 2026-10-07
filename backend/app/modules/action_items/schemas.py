"""Request/response models for action items (docs/api.md → Action items).

WHAT: Pydantic shapes for creating, patching and returning action items, plus list envelopes.
LAYER: Schema (DTOs).
CALLED BY: action_items/router.py and action_items/service.py.
CALLS: Pydantic only.
MERN EQUIVALENT: zod schemas and TypeScript interfaces for the to-do API.
"""

from datetime import date, datetime
from enum import StrEnum
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

ACTION_TEXT_MAX_LENGTH = 500

ActionText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=ACTION_TEXT_MAX_LENGTH)
]

# Fields where an explicit `null` is meaningful ("unassign", "clear the due date").
NULLABLE_FIELDS = frozenset({"assignee_id", "due_date"})


class ActionItemStatus(StrEnum):
    """Allowed values of the `?status=` filter on the cross-meeting list."""

    OPEN = "open"
    COMPLETED = "completed"


# ── Requests ────────────────────────────────────────────────────────────────────────────────────


class ActionItemCreate(BaseModel):
    """Body of POST /meetings/{id}/action-items."""

    text: ActionText
    assignee_id: int | None = None
    due_date: date | None = None


class ActionItemUpdate(BaseModel):
    """PATCH body. Absent field = leave alone; `null` is only accepted for NULLABLE_FIELDS.
    The service reads `model_fields_set` to tell the two apart."""

    text: ActionText | None = None
    assignee_id: int | None = None
    due_date: date | None = None
    is_completed: bool | None = None

    @model_validator(mode="after")
    def _reject_null_for_required_fields(self) -> Self:
        """Reject `null` for text/is_completed but allow it for assignee_id/due_date."""
        # Set subtraction: only the sent fields that are NOT allowed to be null get checked.
        for name in self.model_fields_set - NULLABLE_FIELDS:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


# ── Responses ───────────────────────────────────────────────────────────────────────────────────


class AssigneeBrief(BaseModel):
    """Just enough of a participant to show the assignee chip."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ActionItemRead(BaseModel):
    """An action item as the frontend receives it."""

    id: int
    meeting_id: int
    text: str
    assignee: AssigneeBrief | None
    due_date: date | None
    is_completed: bool
    completed_at: datetime | None
    source_segment_id: int | None
    # Resolved from the linked segment so the UI can "jump to where this was said".
    source_start_ms: int | None
    position: int


class ActionItemWithMeeting(ActionItemRead):
    """Cross-meeting list row: the Home dashboard links each task back to its meeting."""

    meeting_title: str


class ActionItemList(BaseModel):
    """Items of one meeting (not paginated: a meeting has few)."""

    items: list[ActionItemRead]


class ActionItemPage(BaseModel):
    """Paginated envelope for the cross-meeting list: {items, total, page, limit}."""

    items: list[ActionItemWithMeeting]
    total: int
    page: int
    limit: int
