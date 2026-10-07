"""Shared FastAPI dependencies.

WHAT: The two injectable values almost every route needs: a DB session (`DbSession`) and the
    logged-in user (`CurrentUser`).
LAYER: Core, used by the router layer only (routers receive these as parameters).
CALLED BY: every `modules/*/router.py` and core/health.py.
CALLS: database.get_db, and users.service to load the user.
MERN EQUIVALENT: auth middleware that sets `req.user`, plus a per-request DB handle. The
    difference is that handlers declare what they need in their signature instead of reading
    it off `req`.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.users import service as users_service
from app.modules.users.models import User

# No real auth: every request acts as the seeded default user. Swapping in real auth (JWT/Clerk)
# only changes `get_current_user`; every route already depends on it.
DEFAULT_USER_ID = 1

# INTERVIEW: `Annotated[Type, Depends(fn)]` is a reusable alias. Writing `db: DbSession` in a
# route means "give me a Session from get_db". FastAPI resolves it before calling the handler and
# runs get_db's cleanup afterwards.
DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(db: DbSession) -> User:
    """Resolve the user making the request.

    Args:
        db: the request's session (a dependency that depends on another dependency; FastAPI
            resolves the chain, and reuses the same session within one request).
    Returns:
        The seeded default user (id 1). Raises USER_NOT_FOUND if the DB was never seeded.
    Why it exists: the single seam where real authentication would plug in later.
    """
    return users_service.get_user(db, DEFAULT_USER_ID)


# Used in routes as `user: CurrentUser`.
CurrentUser = Annotated[User, Depends(get_current_user)]
