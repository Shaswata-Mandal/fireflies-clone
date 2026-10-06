"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.users import service as users_service
from app.modules.users.models import User

# No real auth: every request acts as the seeded default user. Swapping in real auth (JWT/Clerk)
# only changes `get_current_user`; every route already depends on it.
DEFAULT_USER_ID = 1

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(db: DbSession) -> User:
    return users_service.get_user(db, DEFAULT_USER_ID)


CurrentUser = Annotated[User, Depends(get_current_user)]
