"""HTTP layer for /me.

WHAT: One endpoint that returns the current user.
LAYER: Router (deliberately without a service call).
CALLED BY: main.py (under /api/v1); the frontend's `useCurrentUser` hook.
CALLS: the `CurrentUser` dependency from core/deps.py.
MERN EQUIVALENT: `app.get('/me', auth, (req, res) => res.json(req.user))`.
"""

from fastapi import APIRouter

from app.core.deps import CurrentUser
from app.modules.users.schemas import UserRead

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(user: CurrentUser) -> UserRead:
    """GET /me: the signed-in (seeded default) user."""
    # The CurrentUser dependency already resolved the user, so there is nothing for a service to do.
    return UserRead.model_validate(user)
