"""Transcript database model: `TranscriptSegment`.

WHAT: The `transcript_segments` table; one row per utterance ("who said what, from ms A to B").
LAYER: Model (ORM).
CALLED BY: transcripts/repository.py, meetings/service.py (builds segments on create),
    action_items (source segment link), Alembic.
CALLS: core/database.Base, the created_at mixin.
MERN EQUIVALENT: an array of sub-documents inside a Meeting document; in SQL it is its own table
    with a foreign key back to the meeting.
"""

# Lazy type hints so relationship types from other modules don't need runtime imports (no cycles).
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
    # `__table_args__` holds table-level constraints and indexes.
    __table_args__ = (
        # CHECK constraints make the DB itself reject impossible times, whatever code writes them.
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
    # INTERVIEW: choosing the right ON DELETE rule per relationship (CASCADE vs SET NULL).
    participant_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL"), index=True
    )
    # Raw label from the file; the speaker name survives even if participant_id is nulled.
    speaker_label: Mapped[str] = mapped_column(String(100))
    start_ms: Mapped[int] = mapped_column(Integer)
    end_ms: Mapped[int] = mapped_column(Integer)
    # `Text` = unlimited-length string column (String(n) is for short, bounded values).
    text: Mapped[str] = mapped_column(Text)
    # Order within the meeting (0, 1, 2...), so display order never depends on timestamps.
    position: Mapped[int] = mapped_column(Integer)

    meeting: Mapped[Meeting] = relationship(back_populates="segments")
    participant: Mapped[Participant | None] = relationship()
