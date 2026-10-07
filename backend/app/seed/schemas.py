"""Pydantic models for the seed JSON files.

Validation lives here (not in the loader) so a malformed file is rejected before any DB work, and
the rules read as a spec of the file format. Cross-references use participant `key`s and segment
indexes, which the loader resolves to database ids.

WHAT: The exact shape of `seed/data/*.json` plus cross-checks (one host, chronological segments,
    valid references).
LAYER: Schema for the seed script (not exposed through the API).
CALLED BY: seed/seed.py (`SeedMeeting.model_validate_json`).
CALLS: Pydantic and core/enums.
MERN EQUIVALENT: a Joi schema that validates a JSON fixture before `insertMany`.
"""

from datetime import date, datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.enums import GeneratedBy, MeetingPlatform, MeetingSource, ParticipantRole


class SeedParticipant(BaseModel):
    """A person in one seed file."""

    # `extra="forbid"`: an unknown or misspelled field in the JSON is an error, not ignored.
    model_config = ConfigDict(extra="forbid")

    key: str = Field(min_length=1)  # local handle used by segments / action items in this file
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)  # identity across files
    avatar_color: str = Field(min_length=1, max_length=20)
    role: ParticipantRole


class SeedSegment(BaseModel):
    """One utterance in a seed meeting."""

    model_config = ConfigDict(extra="forbid")

    speaker: str  # participant key
    start_ms: int = Field(ge=0)
    end_ms: int
    text: str = Field(min_length=1)


class SeedSummary(BaseModel):
    """The summary shipped with a seed meeting."""

    model_config = ConfigDict(extra="forbid")

    overview: str = Field(min_length=1)
    bullet_points: list[str] = Field(min_length=1)
    keywords: list[str] = Field(min_length=1)
    generated_by: GeneratedBy = GeneratedBy.SEED


class SeedChapter(BaseModel):
    """One outline entry of a seed meeting."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    start_ms: int = Field(ge=0)


class SeedActionItem(BaseModel):
    """One task of a seed meeting."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=500)
    assignee: str | None = None  # participant key
    due_date: date | None = None
    is_completed: bool = False
    source_segment: int | None = None  # index into `segments` of where it was said


class SeedMeeting(BaseModel):
    """A whole seed file: one meeting with everything that belongs to it."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    meeting_date: datetime
    duration_ms: int = Field(gt=0)
    platform: MeetingPlatform | None = None
    source: MeetingSource = MeetingSource.SEED
    media_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    participants: list[SeedParticipant] = Field(min_length=1)
    segments: list[SeedSegment] = Field(min_length=1)
    summary: SeedSummary
    chapters: list[SeedChapter] = Field(min_length=1)
    action_items: list[SeedActionItem] = Field(min_length=1)

    # INTERVIEW: a `model_validator(mode="after")` runs once ALL fields are valid, so it can check
    # rules that involve several fields at once (references between lists, ordering, totals).
    @model_validator(mode="after")
    def _check_references_and_timeline(self) -> Self:
        """Run every cross-field check; a `ValueError` becomes a validation error."""
        self._check_participants()
        self._check_segments()
        self._check_chapters()
        self._check_action_items()
        return self

    def _check_participants(self) -> None:
        """Keys must be unique and there must be exactly one host."""
        keys = [p.key for p in self.participants]
        # A set drops duplicates, so a length mismatch means a key was repeated.
        if len(set(keys)) != len(keys):
            raise ValueError("duplicate participant key")
        hosts = [p for p in self.participants if p.role == ParticipantRole.HOST]
        if len(hosts) != 1:
            raise ValueError(f"expected exactly one host, found {len(hosts)}")

    def _check_segments(self) -> None:
        """Speakers must exist, times be sane and ordered, and the last end the meeting."""
        keys = {p.key for p in self.participants}
        previous_start = 0
        for index, segment in enumerate(self.segments):
            if segment.speaker not in keys:
                raise ValueError(f"segment {index}: unknown speaker '{segment.speaker}'")
            if segment.end_ms < segment.start_ms:
                raise ValueError(f"segment {index}: end_ms is before start_ms")
            if segment.start_ms < previous_start:
                raise ValueError(f"segment {index}: segments are not in chronological order")
            previous_start = segment.start_ms
        if self.segments[-1].end_ms != self.duration_ms:
            raise ValueError("last segment end_ms must equal duration_ms")

    def _check_chapters(self) -> None:
        """Chapters must be in time order and start inside the meeting."""
        starts = [chapter.start_ms for chapter in self.chapters]
        if starts != sorted(starts):
            raise ValueError("chapters must be ordered by start_ms")
        if starts[-1] > self.duration_ms:
            raise ValueError("a chapter start_ms is beyond duration_ms")

    def _check_action_items(self) -> None:
        """Assignees must be known participants and source segments must exist."""
        keys = {p.key for p in self.participants}
        for index, item in enumerate(self.action_items):
            if item.assignee is not None and item.assignee not in keys:
                raise ValueError(f"action item {index}: unknown assignee '{item.assignee}'")
            if item.source_segment is not None and not (
                0 <= item.source_segment < len(self.segments)
            ):
                raise ValueError(
                    f"action item {index}: source_segment {item.source_segment} does not exist"
                )
