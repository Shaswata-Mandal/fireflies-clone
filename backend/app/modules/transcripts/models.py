from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.db_types import CreatedAtMixin

if TYPE_CHECKING:
    from app.modules.meetings.models import Meeting
    from app.modules.participants.models import Participant


class TranscriptSegment(CreatedAtMixin, Base):
    """One utterance. Times are integer ms from the start of the meeting."""

    __tablename__ = "transcript_segments"
    __table_args__ = (
        CheckConstraint("start_ms >= 0", name="start_ms_non_negative"),
        CheckConstraint("end_ms >= start_ms", name="end_after_start"),
        # Also serves as the meeting_id FK index (meeting_id leads).
        UniqueConstraint("meeting_id", "position"),
        # "Which segment is playing at t?" and chapter → segment lookups.
        Index("ix_segments_meeting_start", "meeting_id", "start_ms"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    # SET NULL, not CASCADE: deleting a person must never delete what was said in a meeting.
    participant_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL"), index=True
    )
    # Raw label from the file; the speaker name survives even if participant_id is nulled.
    speaker_label: Mapped[str] = mapped_column(String(100))
    start_ms: Mapped[int] = mapped_column(Integer)
    end_ms: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer)

    meeting: Mapped[Meeting] = relationship(back_populates="segments")
    participant: Mapped[Participant | None] = relationship()
