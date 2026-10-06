from collections.abc import Callable

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import ActionItem, Chapter, Participant, TranscriptSegment
from tests.helpers import OTHER_USER_ID, MakeMeeting

API = "/api/v1"
MakeSegments = Callable[..., list[TranscriptSegment]]


def export_url(meeting_id: int) -> str:
    return f"{API}/meetings/{meeting_id}/export"


def build_meeting(
    db_session: Session, make_meeting: MakeMeeting, make_segments: MakeSegments
) -> int:
    priya = Participant(name="Priya Shah")
    meeting = make_meeting("Q4 Roadmap: Sync!", participants=[priya], overview="Aligned.")
    make_segments(meeting, [("Priya Shah", "Let's start."), ("Rahul", "Sounds good.")])
    db_session.add_all(
        [
            Chapter(meeting_id=meeting.id, title="Intro", start_ms=0, position=0),
            ActionItem(
                meeting_id=meeting.id,
                text="Send budget",
                assignee_id=priya.id,
                position=0,
                is_completed=True,
            ),
        ]
    )
    db_session.commit()
    return meeting.id


def test_export_markdown_is_a_download_with_slugified_filename(
    api: TestClient,
    db_session: Session,
    make_meeting: MakeMeeting,
    make_segments: MakeSegments,
) -> None:
    meeting_id = build_meeting(db_session, make_meeting, make_segments)

    response = api.get(export_url(meeting_id), params={"format": "md"})

    assert response.status_code == 200
    assert response.headers["content-disposition"] == 'attachment; filename="q4-roadmap-sync.md"'
    assert response.headers["content-type"].startswith("text/markdown")
    body = response.text
    assert body.startswith("# Q4 Roadmap: Sync!")
    assert "**Participants:** Priya Shah" in body
    assert "Aligned." in body
    assert "- [00:00:00] Intro" in body
    assert "- [x] Send budget (@Priya Shah)" in body
    assert "[00:00:00] Priya Shah: Let's start." in body
    assert "[00:00:10] Rahul: Sounds good." in body


def test_export_txt_is_a_download_with_transcript_lines(
    api: TestClient,
    db_session: Session,
    make_meeting: MakeMeeting,
    make_segments: MakeSegments,
) -> None:
    meeting_id = build_meeting(db_session, make_meeting, make_segments)

    response = api.get(export_url(meeting_id), params={"format": "txt"})

    assert response.status_code == 200
    assert response.headers["content-disposition"] == 'attachment; filename="q4-roadmap-sync.txt"'
    assert response.headers["content-type"].startswith("text/plain")
    assert response.text.startswith("Q4 Roadmap: Sync!\nDate: ")
    assert "[00:00:10] Rahul: Sounds good." in response.text
    assert "## " not in response.text  # no Markdown in the plain-text export


def test_export_meeting_without_transcript_still_works(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    meeting = make_meeting("Empty")

    response = api.get(export_url(meeting.id), params={"format": "md"})

    assert response.status_code == 200
    assert "Transcript" not in response.text


def test_export_unsupported_format_is_422(api: TestClient, make_meeting: MakeMeeting) -> None:
    meeting = make_meeting()

    for params in ({"format": "pdf"}, {}):
        response = api.get(export_url(meeting.id), params=params)
        assert response.status_code == 422, params
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_export_other_users_meeting_is_404(api: TestClient, make_meeting: MakeMeeting) -> None:
    meeting = make_meeting(owner_id=OTHER_USER_ID)

    response = api.get(export_url(meeting.id), params={"format": "md"})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MEETING_NOT_FOUND"
