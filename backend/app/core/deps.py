"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db

# No real auth: every request acts as the seeded default user. `get_current_user` (added with the
# User model) will load this id, so swapping in real auth only changes that one function.
DEFAULT_USER_ID = 1

DbSession = Annotated[Session, Depends(get_db)]
