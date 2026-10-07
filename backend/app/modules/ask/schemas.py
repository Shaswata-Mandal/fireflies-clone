"""Request/response models for POST /meetings/{id}/ask (docs/api.md → Ask).

WHAT: The question (with earlier chat turns for context) and the answer with its citations.
LAYER: Schema (DTOs).
CALLED BY: ask/router.py, ask/service.py, ask/prompt.py.
CALLS: Pydantic only.
MERN EQUIVALENT: zod schemas for a chat request and response.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

QUESTION_MAX_LENGTH = 500
HISTORY_CONTENT_MAX_LENGTH = 4000  # an earlier answer can be long; the question limit is lower
HISTORY_MAX_ITEMS = 20  # hard cap on the payload; the service keeps only the last few


class AskMessage(BaseModel):
    """One earlier chat turn, sent back so follow-up questions make sense."""

    # `Literal[...]` allows only these two exact strings (anything else is a 422).
    role: Literal["user", "assistant"]
    content: Annotated[str, StringConstraints(min_length=1, max_length=HISTORY_CONTENT_MAX_LENGTH)]


class AskRequest(BaseModel):
    """Body of both ask endpoints."""

    question: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=QUESTION_MAX_LENGTH)
    ]
    # `default_factory=list`: each request gets its own new empty list.
    history: list[AskMessage] = Field(default_factory=list, max_length=HISTORY_MAX_ITEMS)


class Citation(BaseModel):
    """A transcript line the answer is based on."""

    segment_id: int
    start_ms: int
    speaker_label: str


class AskResponse(BaseModel):
    """Answer for a single-meeting question."""

    answer: str
    citations: list[Citation]


class WorkspaceCitation(Citation):
    """A citation that also says which meeting it points into."""

    meeting_id: int
    meeting_title: str


class WorkspaceAskResponse(BaseModel):
    """Answer for a cross-meeting question."""

    answer: str
    citations: list[WorkspaceCitation]
