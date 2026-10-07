"""SQLAlchemy engine, session factory, declarative Base and the `get_db` dependency."""

from collections.abc import Iterator
from pathlib import Path
from sqlite3 import Connection as SQLiteConnection
from typing import Any

from sqlalchemy import MetaData, create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# Deterministic constraint names. SQLite can't ALTER constraints in place, so Alembic's batch mode
# recreates tables and must be able to refer to every constraint by a stable name.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


# FastAPI runs sync dependencies in a threadpool, so a connection may be used by a thread other
# than the one that opened it. Safe here because each request gets its own session.
_connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}


def ensure_sqlite_parent_dir(database_url: str) -> None:
    """Create the folder of a file-based SQLite DB, e.g. /var/data on a freshly mounted disk.

    SQLite creates the file but not its directory, and the boot would otherwise fail with an
    unhelpful "unable to open database file". In-memory URLs have no path and are skipped.
    """
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite" or not url.database or url.database == ":memory:":
        return
    Path(url.database).parent.mkdir(parents=True, exist_ok=True)


ensure_sqlite_parent_dir(settings.DATABASE_URL)
engine = create_engine(settings.DATABASE_URL, connect_args=_connect_args)


@event.listens_for(engine, "connect")
def set_sqlite_pragmas(dbapi_connection: Any, _connection_record: Any) -> None:
    """SQLite ignores foreign keys unless enabled per connection; WAL allows concurrent reads."""
    if not isinstance(dbapi_connection, SQLiteConnection):
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """One session per request, always closed, even when the handler raises."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
