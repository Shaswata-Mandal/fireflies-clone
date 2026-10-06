"""Request/response models for the summary endpoints (docs/api.md → Summary)."""

from typing import Annotated, Self

from pydantic import BaseModel, StringConstraints, model_validator

from app.modules.meetings.schemas import ChapterRead, SummaryRead

_Line = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class SummaryGenerateRequest(BaseModel):
    include_action_items: bool = False


class SummaryGenerateResponse(BaseModel):
    summary: SummaryRead
    chapters: list[ChapterRead]


class SummaryUpdate(BaseModel):
    """Manual edit. `generated_by` is deliberately not editable (see service.update_summary)."""

    overview: _Line | None = None
    bullet_points: list[_Line] | None = None
    keywords: list[_Line] | None = None

    @model_validator(mode="after")
    def _reject_explicit_null(self) -> Self:
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self
