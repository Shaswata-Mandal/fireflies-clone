from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Participant
from tests.helpers import OTHER_USER_ID, MakeMeeting

API = "/api/v1"


def test_me_returns_default_user(api: TestClient) -> None:
    body = api.get(f"{API}/me").json()

    assert body == {"id": 1, "name": "Default User", "email": "me@example.com", "avatar_url": None}


def test_participants_lists_only_people_from_own_meetings(
    api: TestClient, db_session: Session, make_meeting: MakeMeeting
) -> None:
    mine = Participant(name="Priya Shah", email="priya@acme.com")
    shared = Participant(name="Rahul Verma", email="rahul@acme.com")
    theirs = Participant(name="Stranger Danger", email="x@evil.com")
    db_session.add_all([mine, shared, theirs])
    db_session.commit()
    make_meeting("Mine", participants=[mine, shared])
    make_meeting("Mine too", participants=[shared])  # shared person must still appear once
    make_meeting("Theirs", owner_id=OTHER_USER_ID, participants=[theirs])

    items = api.get(f"{API}/participants").json()["items"]

    assert [p["name"] for p in items] == ["Priya Shah", "Rahul Verma"]
    assert set(items[0]) == {"id", "name", "email", "avatar_color"}


def test_participants_q_matches_name_or_email_case_insensitively(
    api: TestClient, db_session: Session, make_meeting: MakeMeeting
) -> None:
    a = Participant(name="Priya Shah", email="priya@acme.com")
    b = Participant(name="Rahul", email="rahul@globex.io")
    db_session.add_all([a, b])
    db_session.commit()
    make_meeting("M", participants=[a, b])

    by_name = api.get(f"{API}/participants", params={"q": "PRIYA"}).json()["items"]
    by_email = api.get(f"{API}/participants", params={"q": "globex"}).json()["items"]
    wildcard = api.get(f"{API}/participants", params={"q": "%"}).json()["items"]

    assert [p["name"] for p in by_name] == ["Priya Shah"]
    assert [p["name"] for p in by_email] == ["Rahul"]
    assert wildcard == []  # `%` is literal, not a wildcard


def test_participants_q_too_long_is_422(api: TestClient) -> None:
    response = api.get(f"{API}/participants", params={"q": "x" * 201})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
