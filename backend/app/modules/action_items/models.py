"""Action item database model: `ActionItem`.

WHAT: The `action_items` table: a task from a meeting with optional assignee and due date.
LAYER: Model (ORM).
CALLED BY: action_items/repository.py, summaries/builder.py (creates generated items),
    meetings/models.py (relationship), Alembic.
CALLS: core/database.Base, core/db_types mixins.
MERN EQUIVALENT: a Mongoose `ActionItem` schema with `ref`s to Meeting, Participant and Segment.
"""

# Lazy type hints so relationship types from other modules don't need runtime imports (no cycles).
from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.db_types import TimestampMixin, UTCDateTime

if TYPE_CHECKING:
    from app.modules.meetings.models import Meeting
    from app.modules.participants.models import Participant
    from app.modules.transcripts.models import TranscriptSegment


class ActionItem(TimestampMixin, Base):
    """A to-do extracted from, or added to, a meeting."""

    __tablename__ = "action_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), index=True
    )
    text: Mapped[str] = mapped_column(String(500))
    # References to people/segments are nulled, never cascaded: the task outlives its assignee.
    assignee_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL"), index=True
    )
    # `Date` stores a calendar day with no time (due dates have no time zone).
    due_date: Mapped[date | None] = mapped_column(Date)
    # `false()` is a portable SQL "FALSE" literal for the server-side default.
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    # Set/cleared by the service when is_completed toggles.
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    # "Jump to where this was said" in the transcript.
    source_segment_id: Mapped[int | None] = mapped_column(
        ForeignKey("transcript_segments.id", ondelete="SET NULL"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)

    meeting: Mapped[Meeting] = relationship(back_populates="action_items")
    # One-way relationships (no back_populates): we never navigate from participant/segment back.
    assignee: Mapped[Participant | None] = relationship()
    source_segment: Mapped[TranscriptSegment | None] = relationship()
