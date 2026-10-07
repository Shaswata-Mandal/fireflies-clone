"""Request/response models for /meetings. Field names mirror docs/api.md (snake_case).

WHAT: Pydantic models that define the JSON going into and out of the meetings endpoints.
LAYER: Schema (DTOs). No DB access and no business rules beyond field validation.
CALLED BY: meetings/router.py (request and response types), meetings/service.py (builds the
    response models), and other modules that embed these (participant, tag, summary shapes).
CALLS: Pydantic, core/enums, the transcript parser's `TranscriptFormat`.
MERN EQUIVALENT: zod/Joi schemas for request bodies plus the TypeScript interfaces of your API
    responses, in one place and checked at runtime.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated, Self

from pydantic import (
    AfterValidator,
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

from app.core.enums import GeneratedBy, MeetingPlatform, MeetingSource, ParticipantRole
from app.utils.transcript_parser import TranscriptFormat

TITLE_MAX_LENGTH = 200
PARTICIPANT_NAME_MAX_LENGTH = 100
EMAIL_MAX_LENGTH = 255
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# `Annotated[str, StringConstraints(...)]` = a reusable "string type with rules" (like a zod
# `z.string().trim().min(1).max(200)` stored in a variable).
Title = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=TITLE_MAX_LENGTH)
]

# Normalised at the boundary so the response echoes UTC even when the client sent an offset.
# `AwareDatetime` rejects datetimes without a timezone; `AfterValidator` then converts to UTC.
UTCDatetime = Annotated[AwareDatetime, AfterValidator(lambda value: value.astimezone(UTC))]


class MeetingSort(StrEnum):
    """Whitelist of sort keys; a leading `-` means descending. Anything else is a 422."""

    DATE_DESC = "-meeting_date"
    DATE_ASC = "meeting_date"
    TITLE_ASC = "title"
    DURATION_DESC = "-duration_ms"


# ── Requests ────────────────────────────────────────────────────────────────────────────────────


class ParticipantInput(BaseModel):
    """A participant as typed in the create/edit form (no id yet)."""

    name: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True, min_length=1, max_length=PARTICIPANT_NAME_MAX_LENGTH
        ),
    ]
    email: Annotated[
        str | None, StringConstraints(strip_whitespace=True, max_length=EMAIL_MAX_LENGTH)
    ] = None


class MeetingCreate(BaseModel):
    """Body of POST /meetings. Optional pasted transcript and optional AI summary."""

    title: Title
    meeting_date: UTCDatetime
    # `default_factory=list` gives each instance its own new list (never share a mutable default).
    participants: list[ParticipantInput] = Field(default_factory=list)
    # `ge=0` = "greater than or equal to 0".
    duration_ms: int | None = Field(default=None, ge=0)
    transcript_text: str | None = None
    # Omitted -> the parser sniffs the format from the content (pasted text has no filename).
    transcript_format: TranscriptFormat | None = None
    generate_summary: bool = False


class MeetingUpdate(BaseModel):
    """PATCH body: every field optional, but a field that is present must not be null."""

    title: Title | None = None
    meeting_date: UTCDatetime | None = None
    participants: list[ParticipantInput] | None = None

    # INTERVIEW: PATCH semantics. "Absent" means "leave unchanged" but an explicit `null` would be
    # ambiguous for required columns, so it is rejected. `model_fields_set` holds only the field
    # names the client actually sent. `mode="after"` runs once all fields are validated.
    @model_validator(mode="after")
    def _reject_explicit_null(self) -> Self:
        """Raise (which becomes a 422) if the client sent `"title": null` and the like."""
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


# ── Responses ───────────────────────────────────────────────────────────────────────────────────

# `from_attributes=True` lets `X.model_validate(orm_object)` read attributes off an ORM object
# (by default Pydantic only accepts dicts).


class ParticipantBrief(BaseModel):
    """Minimal participant info for avatar stacks on the library cards."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    avatar_color: str | None


class ParticipantRead(ParticipantBrief):
    """Participant with email and the role they had in this meeting."""

    email: str | None
    role: ParticipantRole


class TagRead(BaseModel):
    """A tag chip."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str | None


class SummaryRead(BaseModel):
    """The AI (or seed/mock) summary embedded in a meeting."""

    model_config = ConfigDict(from_attributes=True)

    overview: str
    bullet_points: list[str]
    keywords: list[str]
    generated_by: GeneratedBy


class ChapterRead(BaseModel):
    """One outline entry: a title and the time it starts."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    start_ms: int
    position: int


class MeetingListItem(BaseModel):
    """One card in the meetings library (lighter than the full detail)."""

    id: int
    title: str
    meeting_date: datetime
    duration_ms: int
    platform: MeetingPlatform | None
    participants: list[ParticipantBrief]
    summary_preview: str | None
    action_items_open: int
    tags: list[TagRead]


class MeetingList(BaseModel):
    """Paginated list envelope: {items, total, page, limit} per docs/api.md."""

    items: list[MeetingListItem]
    total: int
    page: int
    limit: int


class MeetingDetail(BaseModel):
    """Everything the meeting page header and side panels need (transcript is fetched apart)."""

    id: int
    title: str
    meeting_date: datetime
    duration_ms: int
    media_url: str | None
    platform: MeetingPlatform | None
    source: MeetingSource
    created_at: datetime
    updated_at: datetime
    participants: list[ParticipantRead]
    summary: SummaryRead | None
    chapters: list[ChapterRead]
    tags: list[TagRead]
