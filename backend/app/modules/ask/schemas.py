"""Request/response models for POST /meetings/{id}/ask (docs/api.md → Ask)."""

from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

QUESTION_MAX_LENGTH = 500
HISTORY_CONTENT_MAX_LENGTH = 4000  # an earlier answer can be long; the question limit is lower
HISTORY_MAX_ITEMS = 20  # hard cap on the payload; the service keeps only the last few


class AskMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: Annotated[str, StringConstraints(min_length=1, max_length=HISTORY_CONTENT_MAX_LENGTH)]


class AskRequest(BaseModel):
    question: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=QUESTION_MAX_LENGTH)
    ]
    history: list[AskMessage] = Field(default_factory=list, max_length=HISTORY_MAX_ITEMS)


class Citation(BaseModel):
    segment_id: int
    start_ms: int
    speaker_label: str


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]


class WorkspaceCitation(Citation):
    """A citation that also says which meeting it points into."""

    meeting_id: int
    meeting_title: str


class WorkspaceAskResponse(BaseModel):
    answer: str
    citations: list[WorkspaceCitation]
