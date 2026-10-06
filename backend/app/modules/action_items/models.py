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
    due_date: Mapped[date | None] = mapped_column(Date)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    # Set/cleared by the service when is_completed toggles.
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    # "Jump to where this was said" in the transcript.
    source_segment_id: Mapped[int | None] = mapped_column(
        ForeignKey("transcript_segments.id", ondelete="SET NULL"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)

    meeting: Mapped[Meeting] = relationship(back_populates="action_items")
    assignee: Mapped[Participant | None] = relationship()
    source_segment: Mapped[TranscriptSegment | None] = relationship()
