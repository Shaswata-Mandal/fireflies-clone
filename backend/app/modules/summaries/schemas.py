"""Request/response models for the summary endpoints (docs/api.md → Summary)."""

from typing import Annotated, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.modules.meetings.schemas import ChapterRead, SummaryRead

# Limits for manual edits; the frontend form mirrors them (modules/summary/constants.ts).
SUMMARY_OVERVIEW_MAX_LENGTH = 5000
SUMMARY_LINE_MAX_LENGTH = 500
SUMMARY_KEYWORD_MAX_LENGTH = 50
SUMMARY_MAX_KEYWORDS = 20


_Overview = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=SUMMARY_OVERVIEW_MAX_LENGTH),
]
_Bullet = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=SUMMARY_LINE_MAX_LENGTH)
]
_Keyword = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=SUMMARY_KEYWORD_MAX_LENGTH),
]


class SummaryGenerateRequest(BaseModel):
    include_action_items: bool = False


class SummaryGenerateResponse(BaseModel):
    summary: SummaryRead
    chapters: list[ChapterRead]


class SummaryUpdate(BaseModel):
    """Manual edit. `generated_by` is deliberately not editable (see service.update_summary)."""

    overview: _Overview | None = None
    bullet_points: list[_Bullet] | None = None
    keywords: Annotated[list[_Keyword], Field(max_length=SUMMARY_MAX_KEYWORDS)] | None = None

    @model_validator(mode="after")
    def _reject_explicit_null(self) -> Self:
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self
