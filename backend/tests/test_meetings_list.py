from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.models import Participant, Tag
from app.modules.meetings.service import SUMMARY_PREVIEW_MAX_CHARS
from tests.helpers import OTHER_USER_ID, MakeMeeting

URL = "/api/v1/meetings"


def at(month: int, day: int, hour: int = 12, minute: int = 0, second: int = 0) -> datetime:
    return datetime(2026, month, day, hour, minute, second, tzinfo=UTC)


@pytest.fixture
def people(db_session: Session) -> dict[str, Participant]:
    priya = Participant(name="Priya Shah", email="priya@acme.com", avatar_color="#7c3aed")
    rahul = Participant(name="Rahul", email="rahul@acme.com", avatar_color="#2563eb")
    db_session.add_all([priya, rahul])
    db_session.commit()
    return {"priya": priya, "rahul": rahul}


@pytest.fixture
def library(
    db_session: Session, make_meeting: MakeMeeting, people: dict[str, Participant]
) -> dict[str, int]:
    """Four meetings for user 1 plus one for user 2; returns title-key → id."""
    roadmap = Tag(name="Roadmap", color="#7c3aed")
    db_session.add(roadmap)
    db_session.commit()
    m1 = make_meeting(
        "Q4 Roadmap Sync",
        meeting_date=at(9, 30, 10),
        duration_ms=2_712_000,
        participants=[people["priya"]],
        tags=[roadmap],
        open_items=2,
        done_items=1,
    )
    m2 = make_meeting(
        "Sales call 50% off",
        meeting_date=at(10, 1, 23, 59, 59),
        duration_ms=1_000_000,
        participants=[people["rahul"]],
    )
    m3 = make_meeting(
        "Sales_call retro",
        meeting_date=at(10, 2, 0, 0, 0),
        duration_ms=3_000_000,
        participants=[people["priya"], people["rahul"]],
    )
    m4 = make_meeting("Hiring", meeting_date=at(10, 5), duration_ms=500)
    make_meeting("Q4 Roadmap Other", owner_id=OTHER_USER_ID, meeting_date=at(10, 3))
    return {"roadmap": m1.id, "percent": m2.id, "underscore": m3.id, "hiring": m4.id}


def ids(response_json: dict) -> list[int]:
    return [item["id"] for item in response_json["items"]]


# ── Filters ─────────────────────────────────────────────────────────────────────────────────────


def test_list_defaults_newest_first_and_scoped_to_current_user(
    api: TestClient, library: dict[str, int]
) -> None:
    body = api.get(URL).json()

    assert ids(body) == [
        library["hiring"],
        library["underscore"],
        library["percent"],
        library["roadmap"],
    ]
    assert (body["total"], body["page"], body["limit"]) == (4, 1, 20)


def test_list_item_shape(api: TestClient, library: dict[str, int]) -> None:
    item = next(i for i in api.get(URL).json()["items"] if i["id"] == library["roadmap"])

    assert item["title"] == "Q4 Roadmap Sync"
    assert item["meeting_date"].startswith("2026-09-30T10:00:00")
    assert item["duration_ms"] == 2_712_000
    assert item["participants"] == [{"id": 1, "name": "Priya Shah", "avatar_color": "#7c3aed"}]
    assert item["action_items_open"] == 2
    assert item["tags"][0]["name"] == "Roadmap"
    assert item["summary_preview"] is None


def test_filter_q_is_case_insensitive(api: TestClient, library: dict[str, int]) -> None:
    assert ids(api.get(URL, params={"q": "ROADMAP"}).json()) == [library["roadmap"]]


@pytest.mark.parametrize(
    ("query", "key"),
    [("%", "percent"), ("50%", "percent"), ("_", "underscore"), ("sales_", "underscore")],
)
def test_filter_q_treats_wildcards_literally(
    api: TestClient, library: dict[str, int], query: str, key: str
) -> None:
    body = api.get(URL, params={"q": query}).json()

    assert ids(body) == [library[key]]
    assert body["total"] == 1


def test_filter_by_participant(api: TestClient, library: dict[str, int], people: dict) -> None:
    body = api.get(URL, params={"participant_id": people["priya"].id}).json()

    assert ids(body) == [library["underscore"], library["roadmap"]]


def test_filter_by_tag(api: TestClient, library: dict[str, int], db_session: Session) -> None:
    tag_id = db_session.query(Tag).one().id

    assert ids(api.get(URL, params={"tag_id": tag_id}).json()) == [library["roadmap"]]


def test_filter_by_date_range_is_inclusive_whole_utc_days(
    api: TestClient, library: dict[str, int]
) -> None:
    # 23:59:59 on Oct 1 is inside the day; 00:00:00 on Oct 2 is not.
    one_day = api.get(URL, params={"date_from": "2026-10-01", "date_to": "2026-10-01"}).json()
    assert ids(one_day) == [library["percent"]]

    from_only = api.get(URL, params={"date_from": "2026-10-02"}).json()
    assert ids(from_only) == [library["hiring"], library["underscore"]]

    to_only = api.get(URL, params={"date_to": "2026-09-30"}).json()
    assert ids(to_only) == [library["roadmap"]]


def test_filters_combine_with_and(api: TestClient, library: dict[str, int], people: dict) -> None:
    params = {"participant_id": people["rahul"].id, "date_from": "2026-10-02", "q": "retro"}

    assert ids(api.get(URL, params=params).json()) == [library["underscore"]]
    assert api.get(URL, params={**params, "q": "nothing-matches"}).json()["total"] == 0


def test_summary_preview_is_truncated(
    api: TestClient, make_meeting: MakeMeeting, db_session: Session
) -> None:
    make_meeting("Short", overview="Brief overview.")
    make_meeting("Long", overview="word " * 200, meeting_date=at(9, 1))

    items = {i["title"]: i for i in api.get(URL).json()["items"]}

    assert items["Short"]["summary_preview"] == "Brief overview."
    long_preview = items["Long"]["summary_preview"]
    assert len(long_preview) <= SUMMARY_PREVIEW_MAX_CHARS
    assert long_preview.endswith("…")


# ── Sorting ─────────────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("sort", "expected"),
    [
        ("-meeting_date", ["hiring", "underscore", "percent", "roadmap"]),
        ("meeting_date", ["roadmap", "percent", "underscore", "hiring"]),
        ("title", ["hiring", "roadmap", "percent", "underscore"]),
        ("-duration_ms", ["underscore", "roadmap", "percent", "hiring"]),
    ],
)
def test_sort_options(
    api: TestClient, library: dict[str, int], sort: str, expected: list[str]
) -> None:
    body = api.get(URL, params={"sort": sort}).json()

    assert ids(body) == [library[key] for key in expected]


@pytest.mark.parametrize("sort", ["id", "-title", "meeting_date; DROP TABLE meetings", ""])
def test_bad_sort_value_is_422(api: TestClient, library: dict[str, int], sort: str) -> None:
    response = api.get(URL, params={"sort": sort})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# ── Pagination ──────────────────────────────────────────────────────────────────────────────────


def test_pagination_pages_and_total(api: TestClient, library: dict[str, int]) -> None:
    page2 = api.get(URL, params={"limit": 2, "page": 2}).json()

    assert ids(page2) == [library["percent"], library["roadmap"]]
    assert (page2["total"], page2["page"], page2["limit"]) == (4, 2, 2)


def test_page_beyond_the_end_is_empty_with_correct_total(
    api: TestClient, library: dict[str, int]
) -> None:
    body = api.get(URL, params={"limit": 2, "page": 9}).json()

    assert body["items"] == []
    assert body["total"] == 4


def test_total_counts_filtered_rows_not_all_rows(api: TestClient, library: dict[str, int]) -> None:
    body = api.get(URL, params={"q": "sales", "limit": 1}).json()

    assert len(body["items"]) == 1
    assert body["total"] == 2


@pytest.mark.parametrize("params", [{"page": 0}, {"limit": 0}, {"limit": 101}])
def test_invalid_pagination_is_422(api: TestClient, params: dict[str, int]) -> None:
    assert api.get(URL, params=params).status_code == 422


# ── No N+1 ──────────────────────────────────────────────────────────────────────────────────────


def test_query_count_does_not_grow_with_the_number_of_meetings(
    api: TestClient,
    engine: Engine,
    make_meeting: MakeMeeting,
    people: dict[str, Participant],
    db_session: Session,
) -> None:
    tag = Tag(name="Roadmap")
    db_session.add(tag)
    db_session.commit()

    def add_meetings(count: int) -> None:
        for i in range(count):
            make_meeting(
                f"Meeting {i}",
                participants=[people["priya"], people["rahul"]],
                tags=[tag],
                overview="An overview.",
                open_items=2,
                done_items=1,
            )

    statements: list[str] = []

    def record(_conn, _cursor, statement, *_args) -> None:  # type: ignore[no-untyped-def]
        statements.append(statement)

    def count_queries() -> int:
        statements.clear()
        event.listen(engine, "before_cursor_execute", record)
        try:
            response = api.get(URL, params={"limit": 100})
        finally:
            event.remove(engine, "before_cursor_execute", record)
        assert response.status_code == 200
        return len(statements)

    add_meetings(6)
    baseline = count_queries()
    add_meetings(6)
    larger = count_queries()

    assert api.get(URL, params={"limit": 100}).json()["total"] == 12
    assert larger == baseline
