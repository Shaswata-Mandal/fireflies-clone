"""SQLAlchemy engine, session factory, declarative Base and the `get_db` dependency.

WHAT: Everything needed to talk to the database: the engine (connection pool), `SessionLocal` (a
    factory for sessions), `Base` (parent of every model) and `get_db` (per-request session).
LAYER: Core infrastructure under the repositories.
CALLED BY: deps.py (`DbSession` uses `get_db`), every models.py (they extend `Base`), main.py
    (startup seed), Alembic's env.py (metadata for migrations), and tests (override `get_db`).
CALLS: config.py for `DATABASE_URL`; SQLAlchemy and the sqlite3 driver.
MERN EQUIVALENT: `mongoose.connect(process.env.MONGO_URL)` in `db.js`. A Session is closest to a
    Mongoose connection plus a unit of work that remembers which objects you changed.
"""

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
# (The %(...)s tokens are templates SQLAlchemy fills in, e.g. "fk_participants_meeting_id_meetings")
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Parent class of every ORM model; each subclass becomes a table.

    Why it exists: it holds the shared `metadata` (the registry of all tables) that Alembic reads
    to detect schema changes.
    """

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


# FastAPI runs sync dependencies in a threadpool, so a connection may be used by a thread other
# than the one that opened it. Safe here because each request gets its own session.
# INTERVIEW: SQLite's driver refuses cross-thread use by default; this flag turns that check off,
# and the one-session-per-request rule is what makes that safe. Other databases need no flag.
_connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}


def ensure_sqlite_parent_dir(database_url: str) -> None:
    """Create the folder of a file-based SQLite DB, e.g. /var/data on a freshly mounted disk.

    SQLite creates the file but not its directory, and the boot would otherwise fail with an
    unhelpful "unable to open database file". In-memory URLs have no path and are skipped.

    Args:
        database_url: the SQLAlchemy URL, e.g. "sqlite:///./fireflies.db".
    Returns:
        None. It only has the side effect of creating directories.
    """
    url = make_url(database_url)
    # Early return = guard clause: skip non-SQLite, path-less, and in-memory databases.
    if url.get_backend_name() != "sqlite" or not url.database or url.database == ":memory:":
        return
    # `parents=True` creates missing ancestors; `exist_ok=True` makes it safe to run every boot.
    Path(url.database).parent.mkdir(parents=True, exist_ok=True)


ensure_sqlite_parent_dir(settings.DATABASE_URL)
# The engine owns the connection pool. It is lazy: no connection opens until the first query.
engine = create_engine(settings.DATABASE_URL, connect_args=_connect_args)


# `@event.listens_for(engine, "connect")` registers this function to run for every NEW raw
# connection the pool opens (like an `on('connect')` listener in Node).
@event.listens_for(engine, "connect")
def set_sqlite_pragmas(dbapi_connection: Any, _connection_record: Any) -> None:
    """SQLite ignores foreign keys unless enabled per connection; WAL allows concurrent reads.

    Args:
        dbapi_connection: the raw driver connection (sqlite3 here).
        _connection_record: pool bookkeeping object; unused.
    Returns:
        None.
    INTERVIEW: without `foreign_keys=ON`, `ON DELETE CASCADE` silently does nothing in SQLite.
    """
    if not isinstance(dbapi_connection, SQLiteConnection):
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    # WAL (write-ahead log) lets readers keep reading while a write is in progress.
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


# INTERVIEW: the two flags matter.
# autoflush=False: pending changes are NOT sent to the DB before every query; repositories call
#   `flush()` explicitly, so SQL is only emitted when we choose.
# expire_on_commit=False: after `commit()`, loaded objects keep their values instead of being
#   reloaded on next access, so we can still return them from services without extra queries.
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """One session per request, always closed, even when the handler raises.

    Yields:
        A fresh `Session` that the route handler (and its dependencies) share for the request.
    Why it exists: a FastAPI "yield dependency". Code before `yield` is setup, code in `finally`
    is cleanup, similar to opening and releasing a DB connection in Express middleware.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
