from collections.abc import Callable

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import ActionItem, Meeting, Participant, TranscriptSegment
from tests.helpers import OTHER_USER_ID, MakeMeeting

API = "/api/v1"
MakeSegments = Callable[..., list[TranscriptSegment]]


def items_url(meeting_id: int) -> str:
    return f"{API}/meetings/{meeting_id}/action-items"


def add_item(api: TestClient, meeting_id: int, **body: object) -> dict:
    response = api.post(items_url(meeting_id), json={"text": "Do the thing", **body})
    assert response.status_code == 201, response.text
    return response.json()


# ── GET /meetings/{id}/action-items ─────────────────────────────────────────────────────────────


def test_list_returns_items_by_position_with_assignee_and_source_start(
    api: TestClient,
    db_session: Session,
    make_meeting: MakeMeeting,
    make_segments: MakeSegments,
) -> None:
    rahul = Participant(name="Rahul")
    meeting = make_meeting(participants=[rahul])
    segments = make_segments(meeting, [("Priya", "a"), ("Rahul", "b")])
    db_session.add_all(
        [
            ActionItem(
                meeting_id=meeting.id,
                text="second",
                position=1,
                assignee_id=rahul.id,
                source_segment_id=segments[1].id,
            ),
            ActionItem(meeting_id=meeting.id, text="first", position=0),
        ]
    )
    db_session.commit()

    items = api.get(items_url(meeting.id)).json()["items"]

    assert [i["text"] for i in items] == ["first", "second"]
    assert items[0]["assignee"] is None
    assert items[0]["source_start_ms"] is None
    assert items[1]["assignee"] == {"id": rahul.id, "name": "Rahul"}
    assert items[1]["source_start_ms"] == 10_000
    assert items[1]["source_segment_id"] == segments[1].id


def test_list_of_other_users_meeting_is_404(api: TestClient, make_meeting: MakeMeeting) -> None:
    meeting = make_meeting(owner_id=OTHER_USER_ID)

    response = api.get(items_url(meeting.id))

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MEETING_NOT_FOUND"


# ── POST ────────────────────────────────────────────────────────────────────────────────────────


def test_create_appends_at_end_with_assignee_and_due_date(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    priya = Participant(name="Priya")
    meeting = make_meeting(participants=[priya], open_items=2)  # existing positions 0, 1

    created = add_item(
        api, meeting.id, text="  Send budget  ", assignee_id=priya.id, due_date="2026-10-10"
    )

    assert created["text"] == "Send budget"
    assert created["position"] == 2
    assert created["assignee"] == {"id": priya.id, "name": "Priya"}
    assert created["due_date"] == "2026-10-10"
    assert created["is_completed"] is False
    assert created["completed_at"] is None
    assert add_item(api, meeting.id)["position"] == 3


def test_create_first_item_gets_position_zero(api: TestClient, make_meeting: MakeMeeting) -> None:
    assert add_item(api, make_meeting().id)["position"] == 0


def test_create_validates_text_length(api: TestClient, make_meeting: MakeMeeting) -> None:
    meeting = make_meeting()

    for text in ("", "   ", "x" * 501):
        response = api.post(items_url(meeting.id), json={"text": text})
        assert response.status_code == 422, text
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert add_item(api, meeting.id, text="x" * 500)["text"] == "x" * 500


def test_create_rejects_assignee_from_another_meeting(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    outsider = Participant(name="Outsider")
    make_meeting("Other meeting", participants=[outsider])
    meeting = make_meeting("This meeting")

    response = api.post(items_url(meeting.id), json={"text": "x", "assignee_id": outsider.id})

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert "not a participant of meeting" in error["message"]


def test_create_in_other_users_meeting_is_404(api: TestClient, make_meeting: MakeMeeting) -> None:
    meeting = make_meeting(owner_id=OTHER_USER_ID)

    response = api.post(items_url(meeting.id), json={"text": "x"})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MEETING_NOT_FOUND"


# ── PATCH ───────────────────────────────────────────────────────────────────────────────────────


def test_patch_updates_text_assignee_and_due_date(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    priya = Participant(name="Priya")
    meeting = make_meeting(participants=[priya])
    item = add_item(api, meeting.id)

    response = api.patch(
        f"{API}/action-items/{item['id']}",
        json={"text": "New text", "assignee_id": priya.id, "due_date": "2026-11-01"},
    )

    assert response.status_code == 200
    body = response.json()
    assert (body["text"], body["due_date"]) == ("New text", "2026-11-01")
    assert body["assignee"] == {"id": priya.id, "name": "Priya"}


def test_patch_assignee_null_unassigns(api: TestClient, make_meeting: MakeMeeting) -> None:
    priya = Participant(name="Priya")
    meeting = make_meeting(participants=[priya])
    item = add_item(api, meeting.id, assignee_id=priya.id, due_date="2026-10-10")

    body = api.patch(f"{API}/action-items/{item['id']}", json={"assignee_id": None}).json()

    assert body["assignee"] is None
    assert body["due_date"] == "2026-10-10"  # not sent -> untouched


def test_patch_without_assignee_field_keeps_assignee(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    priya = Participant(name="Priya")
    meeting = make_meeting(participants=[priya])
    item = add_item(api, meeting.id, assignee_id=priya.id)

    body = api.patch(f"{API}/action-items/{item['id']}", json={"text": "Changed"}).json()

    assert body["assignee"] == {"id": priya.id, "name": "Priya"}


def test_patch_due_date_null_clears_it(api: TestClient, make_meeting: MakeMeeting) -> None:
    item = add_item(api, make_meeting().id, due_date="2026-10-10")

    body = api.patch(f"{API}/action-items/{item['id']}", json={"due_date": None}).json()

    assert body["due_date"] is None


def test_patch_rejects_null_text_and_null_is_completed(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    item = add_item(api, make_meeting().id)

    for payload in ({"text": None}, {"is_completed": None}, {"text": " "}):
        response = api.patch(f"{API}/action-items/{item['id']}", json=payload)
        assert response.status_code == 422, payload


def test_patch_rejects_assignee_from_another_meeting(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    outsider = Participant(name="Outsider")
    make_meeting("Other", participants=[outsider])
    item = add_item(api, make_meeting("Mine").id)

    response = api.patch(f"{API}/action-items/{item['id']}", json={"assignee_id": outsider.id})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_completed_at_is_set_cleared_and_not_restamped(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    item = add_item(api, make_meeting().id)
    url = f"{API}/action-items/{item['id']}"

    done = api.patch(url, json={"is_completed": True}).json()
    assert done["is_completed"] is True
    assert done["completed_at"] is not None

    again = api.patch(url, json={"is_completed": True}).json()
    assert again["completed_at"] == done["completed_at"]  # no flip -> no new timestamp

    reopened = api.patch(url, json={"is_completed": False}).json()
    assert reopened["is_completed"] is False
    assert reopened["completed_at"] is None


def test_patch_other_users_item_is_404(
    api: TestClient, db_session: Session, make_meeting: MakeMeeting
) -> None:
    meeting = make_meeting(owner_id=OTHER_USER_ID, open_items=1)
    item_id = db_session.query(ActionItem).filter_by(meeting_id=meeting.id).one().id

    response = api.patch(f"{API}/action-items/{item_id}", json={"is_completed": True})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ACTION_ITEM_NOT_FOUND"


def test_patch_missing_item_is_404(api: TestClient) -> None:
    assert api.patch(f"{API}/action-items/999", json={"text": "x"}).status_code == 404


# ── DELETE ──────────────────────────────────────────────────────────────────────────────────────


def test_delete_returns_204_and_removes_item(api: TestClient, make_meeting: MakeMeeting) -> None:
    meeting = make_meeting()
    item = add_item(api, meeting.id)

    response = api.delete(f"{API}/action-items/{item['id']}")

    assert response.status_code == 204
    assert response.content == b""
    assert api.get(items_url(meeting.id)).json()["items"] == []


def test_delete_other_users_item_is_404_and_keeps_it(
    api: TestClient, db_session: Session, make_meeting: MakeMeeting
) -> None:
    meeting = make_meeting(owner_id=OTHER_USER_ID, open_items=1)
    item_id = db_session.query(ActionItem).filter_by(meeting_id=meeting.id).one().id

    response = api.delete(f"{API}/action-items/{item_id}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ACTION_ITEM_NOT_FOUND"
    assert db_session.get(ActionItem, item_id) is not None


# ── GET /action-items (cross-meeting) ───────────────────────────────────────────────────────────


def test_list_all_spans_own_meetings_newest_first_with_meeting_info(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    first: Meeting = make_meeting("Alpha", open_items=1)
    second: Meeting = make_meeting("Beta", open_items=1)
    make_meeting("Not mine", owner_id=OTHER_USER_ID, open_items=3)

    body = api.get(f"{API}/action-items").json()

    assert (body["total"], body["page"], body["limit"]) == (2, 1, 20)
    assert [(i["meeting_id"], i["meeting_title"]) for i in body["items"]] == [
        (second.id, "Beta"),
        (first.id, "Alpha"),
    ]


def test_list_all_filters_by_status_and_paginates(
    api: TestClient, make_meeting: MakeMeeting
) -> None:
    make_meeting("M", open_items=3, done_items=2)

    open_page = api.get(f"{API}/action-items", params={"status": "open", "limit": 2}).json()
    done = api.get(f"{API}/action-items", params={"status": "completed"}).json()
    page_two = api.get(f"{API}/action-items", params={"status": "open", "limit": 2, "page": 2})

    assert (open_page["total"], len(open_page["items"])) == (3, 2)
    assert all(not i["is_completed"] for i in open_page["items"])
    assert done["total"] == 2
    assert all(i["is_completed"] for i in done["items"])
    assert len(page_two.json()["items"]) == 1


def test_list_all_rejects_unknown_status(api: TestClient) -> None:
    response = api.get(f"{API}/action-items", params={"status": "bogus"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
