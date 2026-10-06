import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    ActionItem,
    Chapter,
    Meeting,
    MeetingParticipant,
    Participant,
    Summary,
    TranscriptSegment,
)
from app.modules.meetings import service
from tests.helpers import OTHER_USER_ID, MakeMeeting

URL = "/api/v1/meetings"
TXT = (
    "[00:00:05] Priya: Let's start.\n"
    "[00:00:20] Rahul: I'll send the revised budget by Friday.\n"
    "[00:00:40] Priya: We need to finalise the launch date.\n"
)


@pytest.fixture(autouse=True)
def mock_generator(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(service.settings, "LLM_API_KEY", None)


def count(db: Session, model: type) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


def create_full_meeting(api: TestClient) -> int:
    response = api.post(
        URL,
        json={
            "title": "Full",
            "meeting_date": "2026-10-01T09:30:00Z",
            "participants": [{"name": "Priya", "email": "priya@acme.com"}],
            "transcript_text": TXT,
            "generate_summary": True,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


# ── GET ─────────────────────────────────────────────────────────────────────────────────────────


def test_get_returns_detail(api: TestClient) -> None:
    meeting_id = create_full_meeting(api)

    body = api.get(f"{URL}/{meeting_id}").json()

    assert body["id"] == meeting_id
    assert set(body) == {
        "id",
        "title",
        "meeting_date",
        "duration_ms",
        "media_url",
        "platform",
        "source",
        "created_at",
        "updated_at",
        "participants",
        "summary",
        "chapters",
        "tags",
    }
    assert set(body["participants"][0]) == {"id", "name", "email", "avatar_color", "role"}
    assert set(body["summary"]) == {"overview", "bullet_points", "keywords", "generated_by"}
    assert set(body["chapters"][0]) == {"id", "title", "start_ms", "position"}
    assert [c["position"] for c in body["chapters"]] == sorted(
        c["position"] for c in body["chapters"]
    )


# ── PATCH ───────────────────────────────────────────────────────────────────────────────────────


def test_patch_title_and_date(api: TestClient) -> None:
    meeting_id = create_full_meeting(api)

    response = api.patch(
        f"{URL}/{meeting_id}",
        json={"title": "  Renamed  ", "meeting_date": "2026-11-02T08:00:00+02:00"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Renamed"
    assert body["meeting_date"].startswith("2026-11-02T06:00:00")  # stored as UTC
    assert body["summary"] is not None  # untouched fields survive


def test_patch_is_partial(api: TestClient) -> None:
    meeting_id = create_full_meeting(api)
    before = api.get(f"{URL}/{meeting_id}").json()

    after = api.patch(f"{URL}/{meeting_id}", json={}).json()

    assert after["title"] == before["title"]
    assert after["participants"] == before["participants"]


def test_patch_replaces_the_participant_list(api: TestClient, db_session: Session) -> None:
    meeting_id = create_full_meeting(api)  # Priya (host) + Rahul (from transcript)
    old = {p["name"]: p for p in api.get(f"{URL}/{meeting_id}").json()["participants"]}

    response = api.patch(
        f"{URL}/{meeting_id}",
        json={
            "participants": [
                {"name": "Priya", "email": "priya@acme.com"},
                {"name": "Sam", "email": "sam@acme.com"},
            ]
        },
    )

    assert response.status_code == 200
    people = {p["name"]: p for p in response.json()["participants"]}
    assert set(people) == {"Priya", "Sam"}
    assert people["Priya"]["id"] == old["Priya"]["id"]  # same person, not a copy
    assert people["Priya"]["role"] == "host"
    # Rahul left the meeting but still exists as a person (and as a speaker label).
    assert count(db_session, MeetingParticipant) == 2
    assert db_session.scalar(select(Participant).where(Participant.name == "Rahul")) is not None


def test_patch_can_clear_participants(api: TestClient) -> None:
    meeting_id = create_full_meeting(api)

    body = api.patch(f"{URL}/{meeting_id}", json={"participants": []}).json()

    assert body["participants"] == []


def test_patch_bumps_updated_at_for_participant_only_edits(api: TestClient) -> None:
    meeting_id = create_full_meeting(api)
    before = api.get(f"{URL}/{meeting_id}").json()["updated_at"]

    after = api.patch(f"{URL}/{meeting_id}", json={"participants": [{"name": "Sam"}]}).json()

    assert after["updated_at"] > before


@pytest.mark.parametrize(
    "body",
    [
        {"title": ""},
        {"title": "   "},
        {"title": "x" * 201},
        {"title": None},
        {"meeting_date": None},
        {"meeting_date": "2026-10-01T09:30:00"},
        {"participants": [{"name": "  "}]},
        {"participants": [{"name": "Ok"}, {"name": ""}]},
        {"participants": None},
    ],
)
def test_patch_validation_errors(api: TestClient, body: dict) -> None:
    meeting_id = create_full_meeting(api)

    response = api.patch(f"{URL}/{meeting_id}", json=body)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert api.get(f"{URL}/{meeting_id}").json()["title"] == "Full"  # nothing changed


def test_title_at_the_length_limits_is_accepted(api: TestClient) -> None:
    meeting_id = create_full_meeting(api)

    assert api.patch(f"{URL}/{meeting_id}", json={"title": "x"}).status_code == 200
    assert api.patch(f"{URL}/{meeting_id}", json={"title": "x" * 200}).status_code == 200


# ── DELETE ──────────────────────────────────────────────────────────────────────────────────────


def test_delete_returns_204_and_cascades(api: TestClient, db_session: Session) -> None:
    keep_id = create_full_meeting(api)
    delete_id = create_full_meeting(api)
    # Sanity: the graph under test really has rows in every child table.
    for model in (TranscriptSegment, Summary, Chapter, ActionItem, MeetingParticipant):
        assert count(db_session, model) > 0
    segments_before = count(db_session, TranscriptSegment)

    response = api.delete(f"{URL}/{delete_id}")

    assert response.status_code == 204
    assert response.content == b""
    db_session.expire_all()
    for model in (TranscriptSegment, Summary, Chapter, ActionItem, MeetingParticipant):
        remaining = db_session.scalars(select(model)).all()
        assert remaining, f"{model.__name__}: the other meeting's rows must survive"
        assert all(row.meeting_id == keep_id for row in remaining), model.__name__
    assert count(db_session, TranscriptSegment) == segments_before // 2
    assert count(db_session, Meeting) == 1
    assert count(db_session, Participant) == 2  # people outlive the meeting
    assert api.get(f"{URL}/{delete_id}").status_code == 404


def test_delete_last_meeting_leaves_no_children(api: TestClient, db_session: Session) -> None:
    meeting_id = create_full_meeting(api)

    assert api.delete(f"{URL}/{meeting_id}").status_code == 204

    for model in (Meeting, TranscriptSegment, Summary, Chapter, ActionItem, MeetingParticipant):
        assert count(db_session, model) == 0, model.__name__


# ── 404s ────────────────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_unknown_id_is_404(api: TestClient, method: str) -> None:
    kwargs = {"json": {"title": "x"}} if method == "patch" else {}

    response = getattr(api, method)(f"{URL}/9999", **kwargs)

    assert response.status_code == 404
    assert response.json() == {
        "error": {"code": "MEETING_NOT_FOUND", "message": "Meeting 9999 not found", "details": None}
    }


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_other_users_meeting_is_404_not_403(
    api: TestClient, make_meeting: MakeMeeting, db_session: Session, method: str
) -> None:
    foreign = make_meeting("Secret", owner_id=OTHER_USER_ID)
    kwargs = {"json": {"title": "hacked"}} if method == "patch" else {}

    response = getattr(api, method)(f"{URL}/{foreign.id}", **kwargs)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MEETING_NOT_FOUND"
    db_session.expire_all()
    assert db_session.get(Meeting, foreign.id).title == "Secret"  # untouched


def test_non_integer_id_is_422(api: TestClient) -> None:
    response = api.get(f"{URL}/abc")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
