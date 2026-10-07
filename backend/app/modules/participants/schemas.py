"""Response models for /participants (filter dropdown, assignee picker).

WHAT: Pydantic shapes for the participants list endpoint.
LAYER: Schema (DTOs).
CALLED BY: participants/router.py.
CALLS: Pydantic only.
MERN EQUIVALENT: the TypeScript interface/zod schema of the API response.
"""

from pydantic import BaseModel, ConfigDict


class ParticipantItem(BaseModel):
    """One person in the dropdown."""

    # Allows `ParticipantItem.model_validate(orm_participant)` (reads attributes, not dict keys).
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None
    avatar_color: str | None


class ParticipantList(BaseModel):
    """List envelope. No pagination: results are capped at MAX_SEARCH_RESULTS in the repository."""

    items: list[ParticipantItem]
