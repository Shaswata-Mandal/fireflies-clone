from collections.abc import Callable

from fastapi.testclient import TestClient

from app.models import Meeting, Participant, TranscriptSegment
from tests.helpers import OTHER_USER_ID, MakeMeeting

API = "/api/v1"
MakeSegments = Callable[..., list[TranscriptSegment]]


def test_get_transcript_returns_segments_in_position_order(
    api: TestClient, make_meeting: MakeMeeting, make_segments: MakeSegments
) -> None:
    meeting = make_meeting()
    make_segments(meeting, [("Priya", "First."), ("Rahul", "Second."), ("Priya", "Third.")])

    body = api.get(f"{API}/meetings/{meeting.id}/transcript").json()

    assert body["meeting_id"] == meeting.id
    assert [s["text"] for s in body["segments"]] == ["First.", "Second.", "Third."]
    assert [s["position"] for s in body["segments"]] == [0, 1, 2]
    assert set(body["segments"][0]) == {
        "id",
        "position",
        "speaker_label",
        "participant_id",
        "start_ms",
        "end_ms",
        "text",
    }


def test_get_transcript_of_meeting_without_segments_is_empty(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    meeting = make_meeting()

    assert api.get(f"{API}/meetings/{meeting.id}/transcript").json()["segments"] == []


def test_get_transcript_missing_meeting_is_404(api: TestClient) -> None:
    response = api.get(f"{API}/meetings/999/transcript")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MEETING_NOT_FOUND"


def test_get_transcript_of_other_users_meeting_is_404(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    meeting = make_meeting(owner_id=OTHER_USER_ID)

    response = api.get(f"{API}/meetings/{meeting.id}/transcript")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MEETING_NOT_FOUND"


def test_patch_segment_updates_text_and_speaker_and_keeps_timestamps(
    api: TestClient, make_meeting: MakeMeeting, make_segments: MakeSegments, db_session
) -> None:  # noqa: ANN001
    person = Participant(name="Priya")
    db_session.add(person)
    db_session.commit()
    meeting = make_meeting()
    segment = make_segments(meeting, [("Priya", "Teh budget")], {"Priya": person})[0]

    response = api.patch(
        f"{API}/transcript-segments/{segment.id}",
        json={"text": "  The budget  ", "speaker_label": " Priya S. "},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["text"] == "The budget"
    assert body["speaker_label"] == "Priya S."
    assert (body["start_ms"], body["end_ms"]) == (0, 9_000)
    assert body["participant_id"] == person.id


def test_patch_segment_partial_update_leaves_other_field(
    api: TestClient, make_meeting: MakeMeeting, make_segments: MakeSegments
) -> None:
    segment = make_segments(make_meeting(), [("Priya", "Hello")])[0]

    body = api.patch(f"{API}/transcript-segments/{segment.id}", json={"text": "Hi"}).json()

    assert (body["text"], body["speaker_label"]) == ("Hi", "Priya")


def test_patch_segment_rejects_empty_or_null_text(
    api: TestClient, make_meeting: MakeMeeting, make_segments: MakeSegments
) -> None:
    segment = make_segments(make_meeting(), [("Priya", "Hello")])[0]
    url = f"{API}/transcript-segments/{segment.id}"

    for payload in ({"text": "   "}, {"text": None}, {"speaker_label": ""}):
        response = api.patch(url, json=payload)
        assert response.status_code == 422, payload
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_patch_segment_rejects_timestamp_fields(
    api: TestClient, make_meeting: MakeMeeting, make_segments: MakeSegments, db_session
) -> None:  # noqa: ANN001
    segment = make_segments(make_meeting(), [("Priya", "Hello")])[0]

    response = api.patch(f"{API}/transcript-segments/{segment.id}", json={"start_ms": 5})

    assert response.status_code == 422
    db_session.refresh(segment)
    assert segment.start_ms == 0


def test_patch_segment_of_other_users_meeting_is_404(
    api: TestClient, make_meeting: MakeMeeting, make_segments: MakeSegments, db_session
) -> None:  # noqa: ANN001
    meeting: Meeting = make_meeting(owner_id=OTHER_USER_ID)
    segment = make_segments(meeting, [("Priya", "Hello")])[0]

    response = api.patch(f"{API}/transcript-segments/{segment.id}", json={"text": "Hacked"})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SEGMENT_NOT_FOUND"
    db_session.refresh(segment)
    assert segment.text == "Hello"


def test_patch_missing_segment_is_404(api: TestClient) -> None:
    response = api.patch(f"{API}/transcript-segments/999", json={"text": "x"})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SEGMENT_NOT_FOUND"
