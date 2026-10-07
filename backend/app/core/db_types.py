"""Column types and mixins shared by every module's models.

WHAT: Reusable building blocks for models: a UTC-safe datetime column type, a helper for
    enum columns, and mixins that add `created_at` / `updated_at` to a table.
LAYER: Core infrastructure used by the model files (the "M" in the layering).
CALLED BY: every `modules/*/models.py`.
CALLS: SQLAlchemy only.
MERN EQUIVALENT: Mongoose `{ timestamps: true }` (the mixins) and a custom Mongoose SchemaType
    (UTCDateTime).
"""

from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import DateTime, Dialect, Enum, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import TypeDecorator


def utcnow() -> datetime:
    """Return the current time as a timezone-aware UTC datetime.

    Why it exists: one place for "now", used as a column default and by services. Always aware
    (never naive) so `UTCDateTime` accepts it.
    """
    return datetime.now(UTC)


# `TypeDecorator[datetime]` wraps an existing column type and lets us transform values on the way
# in (bind) and out (result). The `[datetime]` is a generic: the Python type this column handles.
class UTCDateTime(TypeDecorator[datetime]):
    """Stores naive UTC, returns timezone-aware UTC.

    SQLite has no timezone storage, so a plain DateTime comes back naive and the API would emit
    "2026-10-01T09:30:00" (ambiguous) instead of "...+00:00". Rejecting naive input on write catches
    "local time passed by mistake" bugs at the boundary instead of silently storing a wrong time.
    """

    impl = DateTime  # the underlying SQL type this decorator wraps
    cache_ok = True  # tells SQLAlchemy this type is safe to use in its compiled-statement cache

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        """Convert a Python datetime to what gets stored (runs on INSERT/UPDATE/filters).

        Args:
            value: the datetime from Python code, or None.
            dialect: the DB dialect in use; unused.
        Returns:
            A naive datetime in UTC, or None.
        """
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("UTCDateTime requires a timezone-aware datetime")
        # Convert any offset to UTC first, then drop the tzinfo because SQLite can't store it.
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        """Convert a stored datetime back to Python (runs on SELECT).

        Args:
            value: the naive datetime read from the DB, or None.
            dialect: the DB dialect in use; unused.
        Returns:
            A timezone-aware UTC datetime, or None.
        """
        # We know everything stored is UTC, so just re-attach the tzinfo (no conversion needed).
        return None if value is None else value.replace(tzinfo=UTC)


def str_enum(enum_cls: type[StrEnum], name: str) -> Enum:
    """A StrEnum stored as TEXT plus a named CHECK constraint (SQLite has no native enum type).

    `values_callable` stores member *values* ("google_meet"), not member names ("GOOGLE_MEET").

    Args:
        enum_cls: the StrEnum class (`type[StrEnum]` means the class itself, not an instance).
        name: the CHECK constraint name, which keeps Alembic migrations deterministic.
    Returns:
        A SQLAlchemy `Enum` column type to pass to `mapped_column(...)`.
    Why it exists: avoids repeating the same Enum options on every enum column.
    """
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,  # no database ENUM type; store plain text instead
        create_constraint=True,  # add CHECK (col IN (...)) so bad values are rejected by the DB
        length=max(len(member.value) for member in enum_cls),  # VARCHAR long enough for any value
        values_callable=lambda cls: [member.value for member in cls],
        validate_strings=True,  # reject unknown strings in Python before they reach the DB
    )


# server_default too, so rows inserted with raw SQL (migrations, FTS triggers) still get a value.
# SQLite's CURRENT_TIMESTAMP is UTC.
# INTERVIEW: a "mixin" is a plain class you inherit alongside `Base` to add columns to many models.
# `default=` is applied by Python/SQLAlchemy on insert; `server_default=` lives in the DB schema.
class CreatedAtMixin:
    """Adds a `created_at` column. For tables whose rows never change after creation."""

    # `Mapped[datetime]` = the Python type; `mapped_column(...)` = how it is stored.
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, server_default=func.current_timestamp()
    )


class TimestampMixin(CreatedAtMixin):
    """Adds `created_at` and `updated_at`. For mutable tables (CLAUDE.md database rules)."""

    # `onupdate=utcnow` refreshes the value whenever the ORM issues an UPDATE for this row.
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, onupdate=utcnow, server_default=func.current_timestamp()
    )
