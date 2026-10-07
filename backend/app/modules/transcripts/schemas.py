"""Request/response models for the transcript endpoints (docs/api.md → Transcript).

WHAT: Pydantic shapes for reading a transcript and editing a segment.
LAYER: Schema (DTOs).
CALLED BY: transcripts/router.py and transcripts/service.py.
CALLS: Pydantic only.
MERN EQUIVALENT: zod schemas / TypeScript interfaces for the request and response JSON.
"""

from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

SPEAKER_LABEL_MAX_LENGTH = 100

# Leading underscore = module-private reusable field types (trim, then require non-empty).
_Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
_SpeakerLabel = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=SPEAKER_LABEL_MAX_LENGTH),
]


class SegmentUpdate(BaseModel):
    """PATCH body. Only text and speaker_label are editable: timestamps drive player sync, and
    `extra="forbid"` turns an attempt to send them into a 422 instead of silently ignoring it."""

    # INTERVIEW: by default Pydantic ignores unknown fields; "forbid" makes them an error.
    model_config = ConfigDict(extra="forbid")

    text: _Text | None = None
    speaker_label: _SpeakerLabel | None = None

    @model_validator(mode="after")
    def _reject_explicit_null(self) -> Self:
        """Allow a field to be absent, but not present-and-null (neither column is nullable)."""
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class SegmentRead(BaseModel):
    """One transcript line as the frontend receives it."""

    # Lets `SegmentRead.model_validate(orm_segment)` read attributes from the ORM object.
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int
    speaker_label: str
    participant_id: int | None
    start_ms: int
    end_ms: int
    text: str


class TranscriptRead(BaseModel):
    """The whole transcript of one meeting."""

    meeting_id: int
    segments: list[SegmentRead]
