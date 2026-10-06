"""Request/response models for /meetings. Field names mirror docs/api.md (snake_case)."""

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

Title = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=TITLE_MAX_LENGTH)
]

# Normalised at the boundary so the response echoes UTC even when the client sent an offset.
UTCDatetime = Annotated[AwareDatetime, AfterValidator(lambda value: value.astimezone(UTC))]


class MeetingSort(StrEnum):
    """Whitelist of sort keys; a leading `-` means descending. Anything else is a 422."""

    DATE_DESC = "-meeting_date"
    DATE_ASC = "meeting_date"
    TITLE_ASC = "title"
    DURATION_DESC = "-duration_ms"


# ── Requests ────────────────────────────────────────────────────────────────────────────────────


class ParticipantInput(BaseModel):
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
    title: Title
    meeting_date: UTCDatetime
    participants: list[ParticipantInput] = Field(default_factory=list)
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

    @model_validator(mode="after")
    def _reject_explicit_null(self) -> Self:
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


# ── Responses ───────────────────────────────────────────────────────────────────────────────────


class ParticipantBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    avatar_color: str | None


class ParticipantRead(ParticipantBrief):
    email: str | None
    role: ParticipantRole


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str | None


class SummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    overview: str
    bullet_points: list[str]
    keywords: list[str]
    generated_by: GeneratedBy


class ChapterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    start_ms: int
    position: int


class MeetingListItem(BaseModel):
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
    items: list[MeetingListItem]
    total: int
    page: int
    limit: int


class MeetingDetail(BaseModel):
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
