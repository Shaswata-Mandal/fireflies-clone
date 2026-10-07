from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import GeneratedBy
from app.models import ActionItem, Chapter, Participant, Summary, TranscriptSegment
from app.modules.summaries import builder
from app.modules.summaries.schemas import (
    SUMMARY_KEYWORD_MAX_LENGTH,
    SUMMARY_LINE_MAX_LENGTH,
    SUMMARY_MAX_KEYWORDS,
    SUMMARY_OVERVIEW_MAX_LENGTH,
)
from tests.helpers import OTHER_USER_ID, MakeMeeting

API = "/api/v1"
MakeSegments = Callable[..., list[TranscriptSegment]]

LINES = [
    ("Priya", "Let's start with the roadmap for the launch."),
    ("Rahul", "I'll send the revised budget by Friday."),
    ("Priya", "The roadmap needs a decision on the launch date."),
    ("Rahul", "We need to finalise the launch date with marketing."),
    ("Priya", "Great, the budget and roadmap look good for launch."),
]


@pytest.fixture(autouse=True)
def mock_generator(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "GROQ_API_KEY", None)


def generate_url(meeting_id: int) -> str:
    return f"{API}/meetings/{meeting_id}/summary/generate"


def count(db: Session, model: type) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


# ── POST generate ───────────────────────────────────────────────────────────────────────────────


def test_generate_creates_summary_and_chapters(
    api: TestClient, make_meeting: MakeMeeting, make_segments: MakeSegments
) -> None:
    meeting = make_meeting()
    make_segments(meeting, LINES)

    response = api.post(generate_url(meeting.id), json={})

    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["overview"]
    assert body["summary"]["generated_by"] == "mock"
    assert body["summary"]["keywords"]
    assert body["chapters"]
    assert [c["position"] for c in body["chapters"]] == list(range(len(body["chapters"])))
    assert api.get(f"{API}/meetings/{meeting.id}").json()["summary"] == body["summary"]


def test_generate_accepts_missing_body(
    api: TestClient, make_meeting: MakeMeeting, make_segments: MakeSegments
) -> None:
    meeting = make_meeting()
    make_segments(meeting, LINES)

    assert api.post(generate_url(meeting.id)).status_code == 200


def test_regeneration_replaces_instead_of_duplicating(
    api: TestClient,
    db_session: Session,
    make_meeting: MakeMeeting,
    make_segments: MakeSegments,
) -> None:
    meeting = make_meeting(overview="Old seeded overview")
    db_session.add(Chapter(meeting_id=meeting.id, title="Old chapter", start_ms=0, position=0))
    db_session.commit()
    make_segments(meeting, LINES)

    first = api.post(generate_url(meeting.id), json={}).json()
    chapters_after_first = count(db_session, Chapter)
    second = api.post(generate_url(meeting.id), json={}).json()

    assert count(db_session, Summary) == 1
    assert count(db_session, Chapter) == chapters_after_first == len(second["chapters"])
    assert first["summary"]["overview"] != "Old seeded overview"
    assert "Old chapter" not in [c["title"] for c in second["chapters"]]
    assert second["summary"]["generated_by"] == "mock"


def test_generate_without_action_items_flag_leaves_items_alone(
    api: TestClient,
    db_session: Session,
    make_meeting: MakeMeeting,
    make_segments: MakeSegments,
) -> None:
    meeting = make_meeting()
    make_segments(meeting, LINES)

    api.post(generate_url(meeting.id), json={"include_action_items": False})

    assert count(db_session, ActionItem) == 0


def test_generate_appends_action_items_without_duplicates(
    api: TestClient,
    db_session: Session,
    make_meeting: MakeMeeting,
    make_segments: MakeSegments,
) -> None:
    rahul = Participant(name="Rahul")
    meeting = make_meeting(participants=[rahul], open_items=1)  # existing "task 0" at position 0
    make_segments(meeting, LINES, {"Rahul": rahul})

    api.post(generate_url(meeting.id), json={"include_action_items": True})
    items = api.get(f"{API}/meetings/{meeting.id}/action-items").json()["items"]
    first_count = len(items)

    assert first_count > 1
    assert items[0]["text"] == "task 0"  # existing item stays first; new ones are appended
    assert [i["position"] for i in items] == list(range(first_count))
    assert any(i["assignee"] == {"id": rahul.id, "name": "Rahul"} for i in items)
    assert any(i["source_start_ms"] is not None for i in items)

    # Regenerating must not add the same extracted items again.
    api.post(generate_url(meeting.id), json={"include_action_items": True})
    again = api.get(f"{API}/meetings/{meeting.id}/action-items").json()["items"]
    assert len(again) == first_count


def test_action_item_dedupe_is_case_insensitive_and_trimmed(
    api: TestClient,
    db_session: Session,
    make_meeting: MakeMeeting,
    make_segments: MakeSegments,
) -> None:
    meeting = make_meeting()
    make_segments(meeting, LINES)
    api.post(generate_url(meeting.id), json={"include_action_items": True})
    extracted = api.get(f"{API}/meetings/{meeting.id}/action-items").json()["items"]
    assert extracted, "mock generator should extract at least one item from LINES"

    # Mangle the stored text's case/whitespace, then regenerate: it must still count as a duplicate.
    for item in db_session.scalars(select(ActionItem)):
        item.text = f"  {item.text.upper()}  "
    db_session.commit()
    api.post(generate_url(meeting.id), json={"include_action_items": True})

    assert count(db_session, ActionItem) == len(extracted)


def test_generate_empty_transcript_is_400(api: TestClient, make_meeting: MakeMeeting) -> None:
    meeting = make_meeting(overview="Keep me")

    response = api.post(generate_url(meeting.id), json={})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "EMPTY_TRANSCRIPT"
    assert api.get(f"{API}/meetings/{meeting.id}").json()["summary"]["overview"] == "Keep me"


def test_generate_other_users_meeting_is_404(
    api: TestClient, make_meeting: MakeMeeting, make_segments: MakeSegments
) -> None:
    meeting = make_meeting(owner_id=OTHER_USER_ID)
    make_segments(meeting, LINES)

    response = api.post(generate_url(meeting.id), json={})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MEETING_NOT_FOUND"


def test_generate_failure_rolls_back_and_keeps_old_summary(
    api: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    make_meeting: MakeMeeting,
    make_segments: MakeSegments,
) -> None:
    meeting = make_meeting(overview="Keep me")
    make_segments(meeting, LINES)

    class Broken:
        def generate(self, _segments: object) -> None:
            raise RuntimeError("model unavailable")

    monkeypatch.setattr(builder, "get_summary_generator", lambda _settings: Broken())

    response = api.post(generate_url(meeting.id), json={})

    assert response.status_code == 500
    assert api.get(f"{API}/meetings/{meeting.id}").json()["summary"]["overview"] == "Keep me"


# ── PATCH summary ───────────────────────────────────────────────────────────────────────────────


def test_patch_summary_updates_fields_and_keeps_generated_by(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    meeting = make_meeting(overview="Original")

    response = api.patch(
        f"{API}/meetings/{meeting.id}/summary",
        json={"overview": "  Edited  ", "keywords": ["budget", " launch "]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["overview"] == "Edited"
    assert body["keywords"] == ["budget", "launch"]
    assert body["generated_by"] == GeneratedBy.SEED.value  # no "manual" value exists in the enum


def test_patch_summary_is_partial(api: TestClient, make_meeting: MakeMeeting) -> None:
    meeting = make_meeting(overview="Original")

    body = api.patch(f"{API}/meetings/{meeting.id}/summary", json={"bullet_points": ["a"]}).json()

    assert (body["overview"], body["bullet_points"]) == ("Original", ["a"])


def test_patch_summary_rejects_empty_overview_and_nulls(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    meeting = make_meeting(overview="Original")

    for payload in ({"overview": " "}, {"overview": None}, {"keywords": None}):
        response = api.patch(f"{API}/meetings/{meeting.id}/summary", json=payload)
        assert response.status_code == 422, payload


def test_patch_summary_without_summary_is_404(api: TestClient, make_meeting: MakeMeeting) -> None:
    meeting = make_meeting()  # no overview -> no summary row

    response = api.patch(f"{API}/meetings/{meeting.id}/summary", json={"overview": "x"})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SUMMARY_NOT_FOUND"


def test_patch_summary_other_users_meeting_is_404(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    meeting = make_meeting(owner_id=OTHER_USER_ID, overview="Theirs")

    response = api.patch(f"{API}/meetings/{meeting.id}/summary", json={"overview": "Mine now"})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MEETING_NOT_FOUND"


def test_patch_summary_enforces_length_limits(api: TestClient, make_meeting: MakeMeeting) -> None:
    meeting = make_meeting(overview="Original")
    too_long = [
        {"overview": "x" * (SUMMARY_OVERVIEW_MAX_LENGTH + 1)},
        {"bullet_points": ["x" * (SUMMARY_LINE_MAX_LENGTH + 1)]},
        {"keywords": ["x" * (SUMMARY_KEYWORD_MAX_LENGTH + 1)]},
        {"keywords": [f"k{i}" for i in range(SUMMARY_MAX_KEYWORDS + 1)]},
    ]

    for payload in too_long:
        response = api.patch(f"{API}/meetings/{meeting.id}/summary", json=payload)
        assert response.status_code == 422, payload
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"
