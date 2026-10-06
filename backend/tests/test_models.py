"""Schema-level guarantees: cascades, SET NULL, CHECK/UNIQUE constraints, UTC round-trip.

Deletes go through Core `delete()` (not `session.delete`) so these prove the *database* enforces the
rules (FK pragma on, ON DELETE actions present), not just the ORM's cascade settings.
"""

from datetime import UTC, datetime, timedelta, timezone

import pytest
from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import IntegrityError, StatementError
from sqlalchemy.orm import Session

from app.core.enums import GeneratedBy, MeetingSource, ParticipantRole
from app.models import (
    ActionItem,
    Chapter,
    Meeting,
    MeetingParticipant,
    Participant,
    Summary,
    TranscriptSegment,
    User,
)

MEETING_DATE = datetime(2026, 10, 1, 9, 30, tzinfo=UTC)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _count(db: Session, model: type) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


def _make_meeting(db: Session) -> tuple[Meeting, Participant]:
    """A meeting with one of every owned child, spoken/assigned by one participant."""
    user = User(name="Default User", email="me@example.com")
    priya = Participant(name="Priya Shah", email="priya@acme.com")
    db.add_all([user, priya])
    db.flush()
    meeting = Meeting(
        owner_id=user.id,
        title="Q4 Roadmap Sync",
        meeting_date=MEETING_DATE,
        source=MeetingSource.SEED,
    )
    segment = TranscriptSegment(
        speaker_label="Priya", participant=priya, start_ms=0, end_ms=4000, text="Hi", position=0
    )
    meeting.segments.append(segment)
    meeting.participant_links.append(
        MeetingParticipant(participant=priya, role=ParticipantRole.HOST)
    )
    meeting.summary = Summary(overview="We aligned.", generated_by=GeneratedBy.SEED)
    meeting.chapters.append(Chapter(title="Intro", start_ms=0, position=0))
    meeting.action_items.append(
        ActionItem(text="Send budget", assignee=priya, source_segment=segment, position=0)
    )
    db.add(meeting)
    db.commit()
    return meeting, priya


# ---------------------------------------------------------------------------
# Cascades
# ---------------------------------------------------------------------------


def test_deleting_meeting_cascades_to_owned_children_but_not_people(db_session: Session) -> None:
    meeting, _ = _make_meeting(db_session)

    db_session.execute(delete(Meeting).where(Meeting.id == meeting.id))
    db_session.commit()

    for model in (TranscriptSegment, Summary, Chapter, ActionItem, MeetingParticipant):
        assert _count(db_session, model) == 0, model.__name__
    assert _count(db_session, Participant) == 1


def test_deleting_participant_nulls_references_and_keeps_speaker_label(
    db_session: Session,
) -> None:
    meeting, priya = _make_meeting(db_session)

    db_session.execute(delete(Participant).where(Participant.id == priya.id))
    db_session.commit()
    db_session.expire_all()

    segment = db_session.scalars(select(TranscriptSegment)).one()
    action_item = db_session.scalars(select(ActionItem)).one()
    assert segment.participant_id is None
    assert segment.speaker_label == "Priya"
    assert action_item.assignee_id is None
    assert _count(db_session, MeetingParticipant) == 0  # attendance link goes with the person
    assert db_session.get(Meeting, meeting.id) is not None


# ---------------------------------------------------------------------------
# Constraints
# ---------------------------------------------------------------------------


def test_segment_end_before_start_is_rejected(db_session: Session) -> None:
    meeting, _ = _make_meeting(db_session)
    db_session.add(
        TranscriptSegment(
            meeting_id=meeting.id,
            speaker_label="Priya",
            start_ms=5000,
            end_ms=1000,
            text="Backwards",
            position=1,
        )
    )

    with pytest.raises(IntegrityError, match="end_after_start"):
        db_session.commit()


def test_second_summary_for_same_meeting_is_rejected(db_session: Session) -> None:
    meeting, _ = _make_meeting(db_session)
    db_session.add(
        Summary(meeting_id=meeting.id, overview="Duplicate", generated_by=GeneratedBy.MOCK)
    )

    with pytest.raises(IntegrityError, match="UNIQUE"):
        db_session.commit()


def test_invalid_enum_value_is_rejected_by_check_constraint(db_session: Session) -> None:
    meeting, _ = _make_meeting(db_session)

    # Raw SQL bypasses SQLAlchemy's own enum validation, so this exercises the DB CHECK.
    with pytest.raises(IntegrityError, match="ck_meetings_meeting_source"):
        db_session.execute(
            text("UPDATE meetings SET source = 'carrier_pigeon' WHERE id = :id"),
            {"id": meeting.id},
        )


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------


def test_datetimes_round_trip_as_aware_utc(db_session: Session) -> None:
    meeting, _ = _make_meeting(db_session)
    db_session.expire_all()

    loaded = db_session.get(Meeting, meeting.id)

    assert loaded is not None
    assert loaded.meeting_date == MEETING_DATE
    assert loaded.meeting_date.tzinfo is UTC
    assert loaded.created_at.tzinfo is UTC


def test_non_utc_datetime_is_normalised_to_utc(db_session: Session) -> None:
    meeting, _ = _make_meeting(db_session)
    ist = timezone(timedelta(hours=5, minutes=30))
    meeting.meeting_date = datetime(2026, 10, 1, 15, 0, tzinfo=ist)
    db_session.commit()
    db_session.expire_all()

    loaded = db_session.get(Meeting, meeting.id)

    assert loaded is not None
    assert loaded.meeting_date == MEETING_DATE  # 15:00 IST == 09:30 UTC


def test_naive_datetime_is_rejected(db_session: Session) -> None:
    meeting, _ = _make_meeting(db_session)
    meeting.meeting_date = datetime(2026, 10, 1, 9, 30)

    with pytest.raises(StatementError, match="timezone-aware"):
        db_session.commit()
