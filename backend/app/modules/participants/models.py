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
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    avatar_color: Mapped[str | None] = mapped_column(String(20))
