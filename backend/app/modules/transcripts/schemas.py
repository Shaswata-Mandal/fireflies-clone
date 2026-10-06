"""Request/response models for the transcript endpoints (docs/api.md → Transcript)."""

from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

SPEAKER_LABEL_MAX_LENGTH = 100

_Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
_SpeakerLabel = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=SPEAKER_LABEL_MAX_LENGTH),
]


class SegmentUpdate(BaseModel):
    """PATCH body. Only text and speaker_label are editable: timestamps drive player sync, and
    `extra="forbid"` turns an attempt to send them into a 422 instead of silently ignoring it."""

    model_config = ConfigDict(extra="forbid")

    text: _Text | None = None
    speaker_label: _SpeakerLabel | None = None

    @model_validator(mode="after")
    def _reject_explicit_null(self) -> Self:
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class SegmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int
    speaker_label: str
    participant_id: int | None
    start_ms: int
    end_ms: int
    text: str


class TranscriptRead(BaseModel):
    meeting_id: int
    segments: list[SegmentRead]
