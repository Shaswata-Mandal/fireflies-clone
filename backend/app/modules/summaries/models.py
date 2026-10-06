from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import JSON, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.db_types import CreatedAtMixin, TimestampMixin, str_enum
from app.core.enums import GeneratedBy

if TYPE_CHECKING:
    from app.modules.meetings.models import Meeting


class Summary(TimestampMixin, Base):
    """AI summary, 1:1 with a meeting (UNIQUE meeting_id). Separate table so regenerating it never
    touches the meeting row and the meetings list query stays light."""

    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), unique=True
    )
    overview: Mapped[str] = mapped_column(Text)
    # Ordered, display-only lists always read/written with the summary; never queried individually.
    bullet_points: Mapped[list[str]] = mapped_column(JSON, default=list, server_default="[]")
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list, server_default="[]")
    generated_by: Mapped[GeneratedBy] = mapped_column(str_enum(GeneratedBy, "generated_by"))

    meeting: Mapped[Meeting] = relationship(back_populates="summary")


class Chapter(CreatedAtMixin, Base):
    """Outline entry; clicking it seeks the player to start_ms."""

    __tablename__ = "chapters"
    # Also serves as the meeting_id FK index (meeting_id leads).
    __table_args__ = (UniqueConstraint("meeting_id", "position"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    start_ms: Mapped[int] = mapped_column(Integer)
    position: Mapped[int] = mapped_column(Integer)

    meeting: Mapped[Meeting] = relationship(back_populates="chapters")
