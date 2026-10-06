"""Column types and mixins shared by every module's models."""

from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import DateTime, Dialect, Enum, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import TypeDecorator


def utcnow() -> datetime:
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator[datetime]):
    """Stores naive UTC, returns timezone-aware UTC.

    SQLite has no timezone storage, so a plain DateTime comes back naive and the API would emit
    "2026-10-01T09:30:00" (ambiguous) instead of "...+00:00". Rejecting naive input on write catches
    "local time passed by mistake" bugs at the boundary instead of silently storing a wrong time.
    """

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("UTCDateTime requires a timezone-aware datetime")
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        return None if value is None else value.replace(tzinfo=UTC)


def str_enum(enum_cls: type[StrEnum], name: str) -> Enum:
    """A StrEnum stored as TEXT plus a named CHECK constraint (SQLite has no native enum type).

    `values_callable` stores member *values* ("google_meet"), not member names ("GOOGLE_MEET").
    """
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=max(len(member.value) for member in enum_cls),
        values_callable=lambda cls: [member.value for member in cls],
        validate_strings=True,
    )


# server_default too, so rows inserted with raw SQL (migrations, FTS triggers) still get a value.
# SQLite's CURRENT_TIMESTAMP is UTC.
class CreatedAtMixin:
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, server_default=func.current_timestamp()
    )


class TimestampMixin(CreatedAtMixin):
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, onupdate=utcnow, server_default=func.current_timestamp()
    )
