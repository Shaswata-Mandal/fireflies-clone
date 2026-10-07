"""Response model for /me.

WHAT: The public fields of a user (no internal columns).
LAYER: Schema (DTO).
CALLED BY: users/router.py.
CALLS: Pydantic only.
"""

from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    """What the API returns for a user."""

    # Allows `UserRead.model_validate(orm_user)` (reads attributes instead of dict keys).
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    avatar_url: str | None
