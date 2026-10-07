"""The lifespan hook seeds an empty DB on boot and leaves a populated one alone."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

import app.main as main_module
from alembic import command
from app.core.config import settings
from app.core.database import set_sqlite_pragmas
from app.models import Meeting

BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture
def migrated_engine(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Engine]:
    """A fresh file DB at head, exactly what start.sh produces before uvicorn starts."""
    url = f"sqlite:///{tmp_path / 'data' / 'boot.db'}"
    (tmp_path / "data").mkdir()
    monkeypatch.setattr(settings, "DATABASE_URL", url)  # env.py reads the URL from settings
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.attributes["configure_logger"] = False
    command.upgrade(config, "head")

    engine = create_engine(url, connect_args={"check_same_thread": False})
    event.listen(engine, "connect", set_sqlite_pragmas)
    # The lifespan opens sessions through app.main.SessionLocal, bound at import time to the dev DB.
    monkeypatch.setattr(main_module, "SessionLocal", sessionmaker(bind=engine))
    yield engine
    engine.dispose()


def _meeting_count(engine: Engine) -> int:
    with Session(engine) as db:
        return db.scalar(select(func.count()).select_from(Meeting)) or 0


def _boot() -> None:
    with TestClient(main_module.create_app()):  # entering the context runs the lifespan
        pass


def test_empty_database_is_seeded_on_boot(
    migrated_engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "SEED_ON_STARTUP", True)
    assert _meeting_count(migrated_engine) == 0

    _boot()

    assert _meeting_count(migrated_engine) >= 1


def test_populated_database_is_left_alone_on_the_next_boot(
    migrated_engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "SEED_ON_STARTUP", True)
    _boot()
    seeded = _meeting_count(migrated_engine)

    _boot()

    assert _meeting_count(migrated_engine) == seeded


def test_seeding_is_skipped_when_disabled(
    migrated_engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "SEED_ON_STARTUP", False)

    _boot()

    assert _meeting_count(migrated_engine) == 0
