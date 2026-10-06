from logging.config import fileConfig
from typing import Any, Literal

from alembic.autogenerate.api import AutogenContext
from sqlalchemy import engine_from_config, pool

# Registers every table on Base.metadata so autogenerate sees the full schema.
import app.models  # noqa: F401
from alembic import context
from app.core.config import settings
from app.core.database import Base
from app.core.db_types import UTCDateTime

config = context.config

# Single source of truth for the DB URL: app settings, not alembic.ini.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Tests run migrations in-process and opt out: fileConfig would disable the app's existing loggers.
if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def render_item(type_: str, obj: Any, _autogen_context: AutogenContext) -> str | Literal[False]:
    """Render app-only column types as their storage type, so migrations never import app code
    (a later refactor of app code must not break an already-applied migration)."""
    if type_ == "type" and isinstance(obj, UTCDateTime):
        return "sa.DateTime()"
    return False  # default rendering


def run_migrations_offline() -> None:
    """Emit SQL to stdout instead of running it against a live connection."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
        render_item=render_item,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against the database.

    Deliberately a separate engine from app.core.database: it does NOT enable
    PRAGMA foreign_keys, because batch mode rebuilds tables (copy -> drop -> rename) and
    dropping a parent table with FKs enforced would cascade-delete child rows.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # SQLite can't ALTER most things; batch mode recreates the table instead.
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
            render_item=render_item,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
