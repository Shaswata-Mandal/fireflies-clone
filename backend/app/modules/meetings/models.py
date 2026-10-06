from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, Index, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.db_types import CreatedAtMixin, TimestampMixin, UTCDateTime, str_enum
from app.core.enums import MeetingPlatform, MeetingSource, ParticipantRole

if TYPE_CHECKING:
    from app.modules.action_items.models import ActionItem
    from app.modules.participants.models import Participant
    from app.modules.summaries.models import Chapter, Summary
    from app.modules.transcripts.models import TranscriptSegment

# Pure link table (no extra columns), so a Table is enough; MeetingParticipant needs a class
# because it carries `role`.
meeting_tags = Table(
    "meeting_tags",
    Base.metadata,
    Column("meeting_id", ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True, index=True),
)


class Meeting(TimestampMixin, Base):
    __tablename__ = "meetings"
    __table_args__ = (
        # The library query is always "this owner's meetings, newest first"; owner_id leads, so this
        # also serves as the owner_id FK index. Plain ASC on purpose: SQLite scans a B-tree index
        # backwards for ORDER BY ... DESC at no extra cost, and a DESC (expression) index can't be
        # reflected by Alembic autogenerate.
        Index("ix_meetings_owner_date", "owner_id", "meeting_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200), index=True)
    meeting_date: Mapped[datetime] = mapped_column(UTCDateTime)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    media_url: Mapped[str | None] = mapped_column(String(500))
    source: Mapped[MeetingSource] = mapped_column(str_enum(MeetingSource, "meeting_source"))
    platform: Mapped[MeetingPlatform | None] = mapped_column(
        str_enum(MeetingPlatform, "meeting_platform")
    )

    # Owned children: the DB's ON DELETE CASCADE removes them (passive_deletes=True), so deleting a
    # meeting doesn't first load every transcript segment into memory just to delete it.
    participant_links: Mapped[list[MeetingParticipant]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", passive_deletes=True
    )
    segments: Mapped[list[TranscriptSegment]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="TranscriptSegment.position",
    )
    summary: Mapped[Summary | None] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", passive_deletes=True
    )
    chapters: Mapped[list[Chapter]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Chapter.position",
    )
    action_items: Mapped[list[ActionItem]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ActionItem.position",
    )
    tags: Mapped[list[Tag]] = relationship(secondary=meeting_tags, passive_deletes=True)


class MeetingParticipant(Base):
    """Association object: who attended which meeting, and in what role."""

    __tablename__ = "meeting_participants"

    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True
    )
    # Not the leading PK column, so it needs its own index for "meetings with participant X".
    participant_id: Mapped[int] = mapped_column(
        ForeignKey("participants.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    role: Mapped[ParticipantRole] = mapped_column(
        str_enum(ParticipantRole, "participant_role"),
        default=ParticipantRole.ATTENDEE,
        server_default=ParticipantRole.ATTENDEE.value,
    )

    meeting: Mapped[Meeting] = relationship(back_populates="participant_links")
    participant: Mapped[Participant] = relationship()


class Tag(CreatedAtMixin, Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    color: Mapped[str | None] = mapped_column(String(20))
