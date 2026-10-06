import os

# Must run before `app` is imported: settings are read once at import time. Tests use an in-memory
# DB and never depend on (or touch) a developer's local .env database.
os.environ.setdefault("ENV", "test")
os.environ.setdefault("SEED_ON_STARTUP", "false")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("CORS_ORIGINS", '["http://testserver"]')

from collections.abc import Iterator  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.engine import Engine  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.models  # noqa: E402, F401  (registers every table on Base.metadata)
from app.core.database import Base, set_sqlite_pragmas  # noqa: E402
from app.main import create_app  # noqa: E402


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
