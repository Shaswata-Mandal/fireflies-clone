import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import GeneratedBy
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
from app.modules.summaries import builder

URL = "/api/v1/meetings"
UPLOAD_URL = f"{URL}/upload"
MEETING_DATE = "2026-10-01T09:30:00Z"

TXT = (
    "[00:00:05] priya shah: Let's start with the roadmap.\n"
    "[00:00:20] Rahul: I'll send the revised budget by Friday.\n"
    "[00:00:40] Priya Shah: We need to finalise the launch date.\n"
    "[00:01:00] Rahul: Sounds good, let's make sure we ship the docs.\n"
)
VTT = (
    "WEBVTT\n\n"
    "00:00:05.000 --> 00:00:10.000\n<v Priya Shah>Let's start with the roadmap.\n\n"
    "00:00:10.000 --> 00:00:20.000\n<v Rahul>I'll send the budget.\n"
)
JSON_TRANSCRIPT = json.dumps(
    {
        "segments": [
            {"speaker": "Priya Shah", "start": 5.0, "end": 11.8, "text": "Let's start."},
            {"speaker": "Rahul", "start": 12.0, "end": 20.5, "text": "Sounds good."},
        ]
    }
)
PRIYA = {"name": "Priya Shah", "email": "priya@acme.com"}


@pytest.fixture(autouse=True)
def mock_generator(monkeypatch: pytest.MonkeyPatch) -> None:
    """A developer's .env may hold a real LLM key; tests must always use the mock."""
    monkeypatch.setattr(settings, "GROQ_API_KEY", None)


def create_payload(**overrides: object) -> dict:
    return {"title": "Design review", "meeting_date": MEETING_DATE, **overrides}


def count(db: Session, model: type) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


def upload(
    api: TestClient,
    filename: str,
    content: bytes,
    *,
    participants: str = "[]",
    generate_summary: str = "false",
    title: str = "Uploaded meeting",
):
    return api.post(
        UPLOAD_URL,
        data={
            "title": title,
            "meeting_date": MEETING_DATE,
            "participants": participants,
            "generate_summary": generate_summary,
        },
        files={"file": (filename, content, "application/octet-stream")},
    )


# ── JSON create ─────────────────────────────────────────────────────────────────────────────────


def test_create_without_transcript(api: TestClient) -> None:
    response = api.post(URL, json=create_payload(participants=[PRIYA, {"name": "Rahul"}]))

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Design review"
    assert body["source"] == "form"
    assert body["platform"] is None
    assert body["duration_ms"] == 0
    assert body["summary"] is None and body["chapters"] == [] and body["tags"] == []
    assert [(p["name"], p["role"]) for p in body["participants"]] == [
        ("Priya Shah", "host"),
        ("Rahul", "attendee"),
    ]
    assert api.get(f"{URL}/{body['id']}").status_code == 200


def test_create_with_transcript_maps_speakers_and_derives_duration(
    api: TestClient, db_session: Session
) -> None:
    response = api.post(
        URL,
        json=create_payload(participants=[PRIYA], transcript_text=TXT, transcript_format="txt"),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["source"] == "paste"
    assert body["duration_ms"] == 65_000  # last segment starts at 60s, +5s default length
    assert body["summary"] is None  # generate_summary defaults to false
    # "priya shah" in the transcript matched the supplied "Priya Shah" (case-insensitively).
    assert sorted(p["name"] for p in body["participants"]) == ["Priya Shah", "Rahul"]
    assert count(db_session, Participant) == 2

    segments = db_session.scalars(
        select(TranscriptSegment).order_by(TranscriptSegment.position)
    ).all()
    assert [s.position for s in segments] == [0, 1, 2, 3]
    priya = db_session.scalar(select(Participant).where(Participant.email == "priya@acme.com"))
    assert segments[0].participant_id == priya.id == segments[2].participant_id
    assert segments[0].speaker_label == "priya shah"  # raw label preserved


def test_explicit_duration_wins_over_transcript(api: TestClient) -> None:
    body = api.post(URL, json=create_payload(duration_ms=999, transcript_text=TXT)).json()

    assert body["duration_ms"] == 999


def test_pasted_transcript_format_is_sniffed_when_omitted(api: TestClient) -> None:
    response = api.post(URL, json=create_payload(transcript_text=VTT))

    assert response.status_code == 201
    assert response.json()["duration_ms"] == 20_000


def test_create_with_summary_builds_summary_chapters_and_action_items(
    api: TestClient, db_session: Session
) -> None:
    response = api.post(URL, json=create_payload(transcript_text=TXT, generate_summary=True))

    assert response.status_code == 201
    body = response.json()
    assert body["summary"]["generated_by"] == "mock"
    assert body["summary"]["overview"]
    assert body["chapters"]
    assert count(db_session, ActionItem) > 0
    items = db_session.scalars(select(ActionItem)).all()
    assert all(item.source_segment_id is not None for item in items)


def test_summary_generator_failure_does_not_fail_creation(
    api: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    class Broken:
        def generate(self, _segments: object) -> None:
            raise RuntimeError("model unavailable")

    monkeypatch.setattr(builder, "get_summary_generator", lambda _settings: Broken())

    response = api.post(URL, json=create_payload(transcript_text=TXT, generate_summary=True))

    assert response.status_code == 201
    assert response.json()["summary"] is None
    assert count(db_session, TranscriptSegment) == 4
    assert count(db_session, Summary) == 0


def test_generate_summary_without_transcript_is_a_no_op(api: TestClient) -> None:
    response = api.post(URL, json=create_payload(generate_summary=True))

    assert response.status_code == 201
    assert response.json()["summary"] is None


def test_unknown_speaker_gets_no_participant(api: TestClient, db_session: Session) -> None:
    response = api.post(URL, json=create_payload(transcript_text="[00:00:01] Hello there.\n"))

    assert response.status_code == 201
    assert response.json()["participants"] == []
    assert db_session.scalar(select(TranscriptSegment)).participant_id is None


def test_existing_participant_is_reused_across_meetings(
    api: TestClient, db_session: Session
) -> None:
    api.post(URL, json=create_payload(participants=[PRIYA]))
    api.post(
        URL, json=create_payload(participants=[{"name": "P. Shah", "email": "PRIYA@acme.com"}])
    )

    assert count(db_session, Participant) == 1
    assert count(db_session, MeetingParticipant) == 2


@pytest.mark.parametrize(
    "overrides",
    [
        {"title": "   "},
        {"title": "x" * 201},
        {"meeting_date": "2026-10-01T09:30:00"},  # naive: ambiguous, rejected
        {"participants": [{"name": "  "}]},
        {"duration_ms": -1},
        {"transcript_format": "docx", "transcript_text": TXT},
    ],
)
def test_create_validation_errors(api: TestClient, overrides: dict) -> None:
    response = api.post(URL, json=create_payload(**overrides))

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_title_is_trimmed(api: TestClient) -> None:
    body = api.post(URL, json=create_payload(title="  Padded  ")).json()

    assert body["title"] == "Padded"


@pytest.mark.parametrize(
    ("transcript", "code"),
    [("   \n", "EMPTY_TRANSCRIPT"), ("[00:00:01 broken", "TRANSCRIPT_PARSE_ERROR")],
)
def test_bad_pasted_transcript_is_400(api: TestClient, transcript: str, code: str) -> None:
    response = api.post(
        URL, json=create_payload(transcript_text=transcript, transcript_format="txt")
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == code


# ── Upload ──────────────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("filename", "content", "segments"),
    [
        ("call.txt", TXT.encode(), 4),
        ("call.vtt", VTT.encode(), 2),
        ("call.json", JSON_TRANSCRIPT.encode(), 2),
        ("CALL.TXT", TXT.encode(), 4),
    ],
)
def test_upload_all_formats(
    api: TestClient, db_session: Session, filename: str, content: bytes, segments: int
) -> None:
    response = upload(api, filename, content, participants=json.dumps([PRIYA]))

    assert response.status_code == 201
    body = response.json()
    assert (body["source"], body["platform"]) == ("upload", "upload")
    assert body["duration_ms"] > 0
    assert {"Priya Shah", "Rahul"} <= {p["name"] for p in body["participants"]}
    assert count(db_session, TranscriptSegment) == segments


def test_upload_with_summary(api: TestClient) -> None:
    response = upload(api, "call.txt", TXT.encode(), generate_summary="true")

    assert response.status_code == 201
    assert response.json()["summary"]["generated_by"] == GeneratedBy.MOCK


def test_upload_accepts_utf8_bom(api: TestClient) -> None:
    assert upload(api, "call.txt", b"\xef\xbb\xbf" + TXT.encode()).status_code == 201


@pytest.mark.parametrize(
    ("filename", "content", "status", "code"),
    [
        ("notes.pdf", b"%PDF-1.4", 400, "UNSUPPORTED_FILE"),
        ("transcript", TXT.encode(), 400, "UNSUPPORTED_FILE"),
        ("empty.txt", b"", 400, "EMPTY_TRANSCRIPT"),
        ("blank.vtt", b"WEBVTT\n\n", 400, "EMPTY_TRANSCRIPT"),
        ("binary.txt", b"\xff\xfe\x00\x01", 400, "TRANSCRIPT_PARSE_ERROR"),
        ("broken.json", b"{not json", 400, "TRANSCRIPT_PARSE_ERROR"),
    ],
)
def test_bad_upload_files(
    api: TestClient,
    db_session: Session,
    filename: str,
    content: bytes,
    status: int,
    code: str,
) -> None:
    response = upload(api, filename, content)

    assert response.status_code == status
    assert response.json()["error"]["code"] == code
    assert count(db_session, Meeting) == 0


def test_oversized_upload_is_413(api: TestClient, db_session: Session) -> None:
    content = b"[00:00:01] A: " + b"x" * service.MAX_UPLOAD_BYTES

    response = upload(api, "huge.txt", content)

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"
    assert count(db_session, Meeting) == 0


def test_upload_exactly_at_the_limit_is_accepted(api: TestClient) -> None:
    padding = b"x" * (service.MAX_UPLOAD_BYTES - len(b"[00:00:01] A: "))

    assert upload(api, "limit.txt", b"[00:00:01] A: " + padding).status_code == 201


def test_upload_bad_participants_json_is_422(api: TestClient, db_session: Session) -> None:
    for bad in ("not json", '{"name": "x"}', '[{"name": ""}]'):
        response = upload(api, "call.txt", TXT.encode(), participants=bad)

        assert response.status_code == 422
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert count(db_session, Meeting) == 0


def test_upload_missing_file_or_title_is_422(api: TestClient) -> None:
    no_file = api.post(UPLOAD_URL, data={"title": "x", "meeting_date": MEETING_DATE})
    blank_title = upload(api, "call.txt", TXT.encode(), title="  ")

    assert no_file.status_code == 422
    assert blank_title.status_code == 422


# ── Atomicity ───────────────────────────────────────────────────────────────────────────────────


def test_failure_during_create_writes_nothing(
    api: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    real_add = service.repository.add

    def add_then_fail(db: Session, meeting: Meeting) -> None:
        real_add(db, meeting)  # everything is flushed to the DB...
        raise RuntimeError("boom")  # ...and then the request dies before the commit

    monkeypatch.setattr(service.repository, "add", add_then_fail)

    response = api.post(
        URL,
        json=create_payload(participants=[PRIYA], transcript_text=TXT, generate_summary=True),
    )

    assert response.status_code == 500
    for model in (
        Meeting,
        Participant,
        MeetingParticipant,
        TranscriptSegment,
        Summary,
        Chapter,
        ActionItem,
    ):
        assert count(db_session, model) == 0, model.__name__
