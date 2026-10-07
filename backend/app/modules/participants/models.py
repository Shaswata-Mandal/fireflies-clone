"""Participant database model.

WHAT: The `participants` table: a person who attends or speaks in meetings.
LAYER: Model (ORM).
CALLED BY: participants/repository.py, meetings/models.py (via MeetingParticipant), transcripts
    and action_items (speaker and assignee foreign keys), Alembic.
CALLS: core/database.Base and the created_at mixin.
MERN EQUIVALENT: a Mongoose `Participant` schema that several Meeting documents reference by id.
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.db_types import CreatedAtMixin


class Participant(CreatedAtMixin, Base):
    """A person who attends/speaks in meetings. Shared across meetings (many-to-many)."""

    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    # NULL allowed for speakers known only by a transcript label; UNIQUE still dedupes real emails
    # (SQL treats NULLs as distinct, so many email-less participants can coexist).
    # INTERVIEW: nullable + unique is a deliberate combo; `unique=True` adds a UNIQUE constraint.
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    avatar_color: Mapped[str | None] = mapped_column(String(20))
