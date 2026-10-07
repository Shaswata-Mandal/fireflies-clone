"""User database model.

WHAT: The `users` table: the account that owns meetings.
LAYER: Model (ORM).
CALLED BY: users/repository.py, core/deps.py (the "current user"), the seed script, and the
    `owner_id` foreign key of meetings.
CALLS: core/database.Base and the created_at mixin.
MERN EQUIVALENT: a Mongoose `User` schema (minus the password hash, since there is no login).
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.db_types import CreatedAtMixin


class User(CreatedAtMixin, Base):
    """The account that owns meetings. No password column: auth is out of scope (see deps.py)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
