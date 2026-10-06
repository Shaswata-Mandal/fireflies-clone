import os

# Must run before `app` is imported: settings are read once at import time. Tests use an in-memory
# DB and never depend on (or touch) a developer's local .env database.
os.environ.setdefault("ENV", "test")
os.environ.setdefault("SEED_ON_STARTUP", "false")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("CORS_ORIGINS", '["http://testserver"]')

from collections.abc import Callable, Iterator  # noqa: E402
from datetime import UTC, datetime  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.engine import Engine  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.models  # noqa: E402, F401  (registers every table on Base.metadata)
from app.core.database import Base, get_db, set_sqlite_pragmas  # noqa: E402
from app.core.enums import GeneratedBy, MeetingSource  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models import (  # noqa: E402
    ActionItem,
    Meeting,
    MeetingParticipant,
    Participant,
    Summary,
    Tag,
    TranscriptSegment,
    User,
)
from tests.helpers import OTHER_USER_ID, MakeMeeting  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture
def engine() -> Iterator[Engine]:
    # StaticPool = one shared connection, so every session (and the TestClient's worker thread in
    # later slices) sees the same in-memory database. Fresh DB per test → no cross-test leakage.
    test_engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    event.listen(test_engine, "connect", set_sqlite_pragmas)
    Base.metadata.create_all(test_engine)
    yield test_engine
    test_engine.dispose()


@pytest.fixture
def db_session(engine: Engine) -> Iterator[Session]:
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    yield session
    session.close()


@pytest.fixture
def api(engine: Engine) -> Iterator[TestClient]:
    """App wired to the in-memory DB with users 1 (the default) and 2 (to test isolation).

    `raise_server_exceptions=False` so an unhandled error is returned as the 500 response a real
    client would see, instead of being re-raised into the test.
    """
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db() -> Iterator[Session]:
        session = factory()
        try:
            yield session
        finally:
            session.close()

    with factory() as setup:
        setup.add(User(id=1, name="Default User", email="me@example.com"))
        setup.add(User(id=OTHER_USER_ID, name="Other User", email="other@example.com"))
        setup.commit()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def make_meeting(db_session: Session) -> MakeMeeting:
    """Insert a meeting directly (bypassing the API) with optional participants/tags/items."""

    def _make(
        title: str = "Weekly sync",
        *,
        owner_id: int = 1,
        meeting_date: datetime | None = None,
        duration_ms: int = 0,
        participants: list[Participant] | None = None,
        tags: list[Tag] | None = None,
        overview: str | None = None,
        open_items: int = 0,
        done_items: int = 0,
    ) -> Meeting:
        meeting = Meeting(
            owner_id=owner_id,
            title=title,
            meeting_date=meeting_date or datetime(2026, 10, 1, 9, 0, tzinfo=UTC),
            duration_ms=duration_ms,
            source=MeetingSource.FORM,
            tags=tags or [],
            participant_links=[
                MeetingParticipant(participant=person) for person in participants or []
            ],
            summary=Summary(overview=overview, generated_by=GeneratedBy.SEED) if overview else None,
            action_items=[
                ActionItem(text=f"task {i}", is_completed=i >= open_items, position=i)
                for i in range(open_items + done_items)
            ],
        )
        db_session.add(meeting)
        db_session.commit()
        return meeting

    return _make


@pytest.fixture
def make_segments(db_session: Session) -> Callable[..., list[TranscriptSegment]]:
    """Insert transcript segments for a meeting: one `(speaker, text)` pair per 10 s segment."""

    def _make(
        meeting: Meeting,
        lines: list[tuple[str, str]],
        participants: dict[str, Participant] | None = None,
    ) -> list[TranscriptSegment]:
        people = participants or {}
        segments = [
            TranscriptSegment(
                meeting_id=meeting.id,
                participant=people.get(speaker),
                speaker_label=speaker,
                start_ms=i * 10_000,
                end_ms=i * 10_000 + 9_000,
                text=text,
                position=i,
            )
            for i, (speaker, text) in enumerate(lines)
        ]
        db_session.add_all(segments)
        db_session.commit()
        return segments

    return _make
