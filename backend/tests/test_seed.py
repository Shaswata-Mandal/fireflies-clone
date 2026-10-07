import json
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import DEFAULT_USER_ID
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
from app.seed.seed import SEED_DATA_DIR, SeedDataError, load_seed_files, seed_if_empty

SEEDED_TABLES = (User, Meeting, Participant, MeetingParticipant, TranscriptSegment, Summary)
MIN_SEGMENTS, MAX_SEGMENTS = 40, 150
MIN_SEGMENT_MS, MAX_SEGMENT_MS = 5_000, 40_000
MIN_DURATION_MS, MAX_DURATION_MS = 8 * 60_000, 55 * 60_000


def _counts(db: Session) -> dict[str, int]:
    tables = (*SEEDED_TABLES, Chapter, ActionItem)
    return {t.__tablename__: db.scalar(select(func.count()).select_from(t)) or 0 for t in tables}


def _valid_file() -> dict:
    """The smallest file that passes validation; tests break one field at a time."""
    return {
        "title": "Tiny sync",
        "meeting_date": "2026-09-01T10:00:00Z",
        "duration_ms": 20_000,
        "participants": [
            {
                "key": "a",
                "name": "Ann Lee",
                "email": "ann@example.com",
                "avatar_color": "#7c3aed",
                "role": "host",
            }
        ],
        "segments": [
            {"speaker": "a", "start_ms": 0, "end_ms": 10_000, "text": "Hello there."},
            {"speaker": "a", "start_ms": 11_000, "end_ms": 20_000, "text": "Bye now."},
        ],
        "summary": {"overview": "Short.", "bullet_points": ["x"], "keywords": ["y"]},
        "chapters": [{"title": "All", "start_ms": 0}],
        "action_items": [{"text": "Do it", "assignee": "a", "source_segment": 1}],
    }


def _write(directory: Path, name: str, data: dict) -> None:
    (directory / name).write_text(json.dumps(data), encoding="utf-8")


# ── Loader behaviour ────────────────────────────────────────────────────────────────────────────


def test_seeding_twice_creates_nothing_new(db_session: Session) -> None:
    assert seed_if_empty(db_session) is True
    first = _counts(db_session)

    assert seed_if_empty(db_session) is False

    assert _counts(db_session) == first
    assert first["meetings"] >= 1


def test_default_user_is_created_even_when_meetings_exist(db_session: Session) -> None:
    seed_if_empty(db_session)
    db_session.delete(db_session.get(User, DEFAULT_USER_ID))
    db_session.commit()
    db_session.expunge_all()  # the DB cascade removed the meetings behind the session's back

    # Meetings were cascade-deleted with the user, so this re-seeds; the user must come back.
    seed_if_empty(db_session)

    assert db_session.get(User, DEFAULT_USER_ID) is not None


def test_valid_minimal_file_is_inserted(db_session: Session, tmp_path: Path) -> None:
    _write(tmp_path, "ok.json", _valid_file())

    assert seed_if_empty(db_session, tmp_path) is True

    action = db_session.scalars(select(ActionItem)).one()
    assert action.source_segment is not None and action.source_segment.text == "Bye now."


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda d: d["segments"][0].update(end_ms=-1), "end_ms is before start_ms"),
        (lambda d: d["segments"].reverse(), "chronological order"),
        (lambda d: d["action_items"][0].update(source_segment=9), "does not exist"),
        (lambda d: d["chapters"][0].update(start_ms=99_999), "beyond duration_ms"),
        (lambda d: d.update(duration_ms=30_000), "must equal duration_ms"),
        (lambda d: d["segments"][0].update(speaker="ghost"), "unknown speaker"),
    ],
)
def test_invalid_file_is_rejected_naming_the_file(
    db_session: Session, tmp_path: Path, mutate, message: str
) -> None:
    data = _valid_file()
    mutate(data)
    _write(tmp_path, "broken.json", data)

    with pytest.raises(SeedDataError, match=f"broken.json.*{message}"):
        seed_if_empty(db_session, tmp_path)

    assert db_session.scalar(select(func.count()).select_from(Meeting)) == 0


def test_one_bad_file_prevents_every_insert(db_session: Session, tmp_path: Path) -> None:
    _write(tmp_path, "a_good.json", _valid_file())
    bad = _valid_file()
    bad["participants"][0]["email"] = "other@example.com"
    bad["segments"][0]["end_ms"] = -5
    _write(tmp_path, "b_bad.json", bad)

    with pytest.raises(SeedDataError, match="b_bad.json"):
        seed_if_empty(db_session, tmp_path)

    assert db_session.scalar(select(func.count()).select_from(Meeting)) == 0


def test_same_email_with_different_name_is_rejected(tmp_path: Path) -> None:
    _write(tmp_path, "a.json", _valid_file())
    other = _valid_file()
    other["participants"][0]["name"] = "Someone Else"
    _write(tmp_path, "b.json", other)

    with pytest.raises(SeedDataError, match="b.json.*ann@example.com"):
        load_seed_files(tmp_path)


def test_empty_directory_is_an_error(tmp_path: Path) -> None:
    with pytest.raises(SeedDataError, match="no seed files"):
        load_seed_files(tmp_path)


# ── Shipped seed content ────────────────────────────────────────────────────────────────────────


def test_every_seeded_meeting_is_complete_and_ordered(db_session: Session) -> None:
    seed_if_empty(db_session)

    meetings = db_session.scalars(select(Meeting)).all()
    assert meetings
    for meeting in meetings:
        assert meeting.summary is not None and meeting.summary.generated_by == "seed"
        assert 4 <= len(meeting.chapters) <= 6
        assert 3 <= len(meeting.action_items) <= 8
        assert MIN_DURATION_MS <= meeting.duration_ms <= MAX_DURATION_MS

        segments = meeting.segments  # already ordered by position
        assert MIN_SEGMENTS <= len(segments) <= MAX_SEGMENTS
        assert [s.position for s in segments] == list(range(len(segments)))
        assert [s.start_ms for s in segments] == sorted(s.start_ms for s in segments)
        assert segments[-1].end_ms == meeting.duration_ms
        assert all(MIN_SEGMENT_MS <= s.end_ms - s.start_ms <= MAX_SEGMENT_MS for s in segments)

        assert sum(1 for link in meeting.participant_links if link.role == "host") == 1
        assert 1 <= sum(a.is_completed for a in meeting.action_items) <= 3
        assert all(a.source_segment_id is not None for a in meeting.action_items)


def test_participants_are_unique_by_email(db_session: Session) -> None:
    seed_if_empty(db_session)

    emails = db_session.scalars(select(Participant.email)).all()
    assert len(emails) == len(set(emails))
    assert SEED_DATA_DIR.exists()
