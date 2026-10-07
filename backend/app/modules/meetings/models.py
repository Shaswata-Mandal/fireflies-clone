"""Meeting database models: `Meeting`, the `MeetingParticipant` link and `Tag`.

WHAT: The tables for meetings, their many-to-many links to participants and tags.
LAYER: Model (ORM). Pure table definitions, no logic.
CALLED BY: meetings/repository.py (queries), meetings/service.py (builds objects), other modules'
    models (relationships point back here) and Alembic (schema detection).
CALLS: core/database.Base, core/db_types (mixins, enum helper), core/enums.
MERN EQUIVALENT: a Mongoose `Schema` + `model('Meeting')`. In Mongo you would embed participants
    or store ObjectId arrays; SQL uses link tables with foreign keys instead.
"""

# INTERVIEW: this import makes every type hint a lazy string, so `Mapped[list[Chapter]]` can name
# classes from other modules without importing them at runtime (that would be a circular import).
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, Index, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.db_types import CreatedAtMixin, TimestampMixin, UTCDateTime, str_enum
from app.core.enums import MeetingPlatform, MeetingSource, ParticipantRole

# `TYPE_CHECKING` is False at runtime and True only for editors/type checkers, so these imports
# exist purely for type hints and cannot cause import cycles.
if TYPE_CHECKING:
    from app.modules.action_items.models import ActionItem
    from app.modules.participants.models import Participant
    from app.modules.summaries.models import Chapter, Summary
    from app.modules.transcripts.models import TranscriptSegment

# Pure link table (no extra columns), so a Table is enough; MeetingParticipant needs a class
# because it carries `role`.
# The composite primary key (meeting_id, tag_id) also stops the same tag being added twice.
meeting_tags = Table(
    "meeting_tags",
    Base.metadata,
    Column("meeting_id", ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True, index=True),
)


class Meeting(TimestampMixin, Base):
    """One meeting row: metadata plus links to everything that belongs to it.

    Why it exists: the central entity of the app; transcripts, summaries, chapters and action
    items all hang off it and are deleted with it.
    """

    __tablename__ = "meetings"
    __table_args__ = (
        # The library query is always "this owner's meetings, newest first"; owner_id leads, so this
        # also serves as the owner_id FK index. Plain ASC on purpose: SQLite scans a B-tree index
        # backwards for ORDER BY ... DESC at no extra cost, and a DESC (expression) index can't be
        # reflected by Alembic autogenerate.
        # INTERVIEW: composite index; column order matters (equality column first, sort column
        # second).
        Index("ix_meetings_owner_date", "owner_id", "meeting_date"),
    )

    # `Mapped[int]` is the Python type; `mapped_column(primary_key=True)` makes it an
    # auto-incrementing integer id.
    id: Mapped[int] = mapped_column(primary_key=True)
    # ondelete="CASCADE": the DB deletes the meeting when its owner user is deleted.
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200), index=True)
    meeting_date: Mapped[datetime] = mapped_column(UTCDateTime)
    # Integer milliseconds (CLAUDE.md rule). `default` is applied by Python, `server_default` by DB.
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # `X | None` in Mapped[] makes the column nullable (NULL allowed).
    media_url: Mapped[str | None] = mapped_column(String(500))
    source: Mapped[MeetingSource] = mapped_column(str_enum(MeetingSource, "meeting_source"))
    platform: Mapped[MeetingPlatform | None] = mapped_column(
        str_enum(MeetingPlatform, "meeting_platform")
    )

    # Owned children: the DB's ON DELETE CASCADE removes them (passive_deletes=True), so deleting a
    # meeting doesn't first load every transcript segment into memory just to delete it.
    # INTERVIEW: relationship options.
    #   back_populates: names the matching attribute on the other class (keeps both sides in sync).
    #   cascade="all, delete-orphan": ORM-level; saving/deleting the parent affects children, and
    #       removing a child from the list deletes it.
    #   passive_deletes=True: trust the DB's ON DELETE CASCADE instead of loading children first.
    participant_links: Mapped[list[MeetingParticipant]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", passive_deletes=True
    )
    # `order_by` as a string is resolved lazily, so the class need not be imported here.
    segments: Mapped[list[TranscriptSegment]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="TranscriptSegment.position",
    )
    # `Mapped[Summary | None]` with a single object (not a list) = one-to-one (at most one summary).
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
    # `secondary=` names the link table, giving a many-to-many (like an array of tag refs).
    tags: Mapped[list[Tag]] = relationship(secondary=meeting_tags, passive_deletes=True)


class MeetingParticipant(Base):
    """Association object: who attended which meeting, and in what role."""

    __tablename__ = "meeting_participants"

    # Two primary_key=True columns form a composite key: one row per (meeting, participant) pair.
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
    # No back_populates: we only ever navigate link -> participant, never the other way.
    participant: Mapped[Participant] = relationship()


class Tag(CreatedAtMixin, Base):
    """A label that can be attached to many meetings (many-to-many via `meeting_tags`)."""

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    color: Mapped[str | None] = mapped_column(String(20))
