# 03 — Database

Source of truth for this file: the **SQLAlchemy models** (`backend/app/modules/*/models.py`) and the migration `backend/alembic/versions/0001_initial_schema.py`. Where `docs/schema.md` differs, it is called out in §5.

SQLite file: `backend/fireflies.db` (git-ignored; WAL mode also creates `-wal`/`-shm` files).

## 1. Shared building blocks (`core/db_types.py`, `core/database.py`)

| Piece | What it is |
|---|---|
| `Base` | `DeclarativeBase` with `MetaData(naming_convention=…)`: every index/unique/check/FK/PK gets a deterministic name (`ix_…`, `uq_…`, `ck_<table>_<name>`, `fk_<table>_<col>_<ref>`, `pk_…`). Needed so Alembic batch mode can recreate tables on SQLite. |
| `CreatedAtMixin` | `created_at: UTCDateTime NOT NULL`, Python default `utcnow()` **and** `server_default CURRENT_TIMESTAMP` (so raw-SQL inserts get a value too). |
| `TimestampMixin(CreatedAtMixin)` | adds `updated_at` with the same defaults plus `onupdate=utcnow`. |
| `UTCDateTime` | `TypeDecorator` over `DateTime`: **writes naive UTC, reads aware UTC, rejects naive input** (`ValueError`). |
| `str_enum(EnumCls, name)` | Python `StrEnum` stored as `VARCHAR` + a named `CHECK` (`native_enum=False`, `create_constraint=True`, `values_callable` stores the *values*). |

Python enums (`core/enums.py`): `MeetingSource` = seed/upload/paste/form; `MeetingPlatform` = zoom/google_meet/teams/upload; `ParticipantRole` = host/attendee; `GeneratedBy` = seed/mock/llm.

## 2. ER diagram (ASCII)

```
                         ┌──────────┐
                         │  users   │
                         └────┬─────┘
                              │ 1
                              │ owns            (CASCADE)
                              │ N
┌────────────┐   N     ┌──────┴───────┐ 1      ┌────────────┐
│    tags    ├─────────┤ meeting_tags ├────────┤            │
└────────────┘ CASCADE └──────────────┘ CASCADE│            │
   (name UNIQUE)         PK(meeting_id,tag_id) │            │
                                               │  meetings  │
┌──────────────┐ N  ┌─────────────────────┐ 1  │            │
│ participants ├────┤ meeting_participants├────┤            │
└──┬────┬──────┘    └─────────────────────┘    └──┬──┬──┬──┬┘
   │    │ CASCADE both sides, PK(meeting_id,      │  │  │  │
   │    │ participant_id), + role                 │  │  │  │
   │    │                                         │  │  │  │ CASCADE (all 4)
   │    │ SET NULL                                │  │  │  │
   │    └───────────────┐        ┌────────────────┘  │  │  └──────────────┐
   │ SET NULL           │        │ 1:N               │  │ 1:N             │ 1:N
   │ (assignee)         ▼        ▼                   │  ▼                 ▼
   │               ┌──────────────────────┐          │ ┌──────────┐ ┌─────────────┐
   │               │ transcript_segments  │          │ │ chapters │ │ action_items│
   │               └───────────┬──────────┘          │ └──────────┘ └──────┬──────┘
   │                           │ SET NULL            │                     │
   │                           └─────────────────────┼─────────────────────┘
   │                              (source_segment_id)│     ▲ SET NULL (assignee_id)
   └─────────────────────────────────────────────────┼─────┘
                                                     │ 1:1 (UNIQUE meeting_id)
                                                ┌────┴─────┐
                                                │ summaries│
                                                └──────────┘
```

Reading it: `meetings` is the hub. Its **owned children** (`transcript_segments`, `chapters`, `action_items`, `summaries`, and the two link tables) die with it (`CASCADE`). References to **people or segments** from other rows (`transcript_segments.participant_id`, `action_items.assignee_id`, `action_items.source_segment_id`) are `SET NULL`: deleting a person or segment never deletes content.

## 3. Tables (from the real models)

Notation: `NN` = NOT NULL. `idx` = index. All `id` columns are `INTEGER PRIMARY KEY` (autoincrement). Column types are the SQLAlchemy types; SQLite stores them as TEXT/INTEGER/NUMERIC affinities.

### `users`: `users/models.py::User` (mixin: `CreatedAtMixin`)

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK `pk_users` |
| name | VARCHAR(100) | NN |
| email | VARCHAR(255) | NN, UNIQUE `uq_users_email` |
| avatar_url | VARCHAR(500) | NULL |
| created_at | DATETIME (UTC) | NN, default now |

No password column (auth is out of scope). One row (id=1) is created by the seed.

### `participants`: `participants/models.py::Participant` (`CreatedAtMixin`)

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| name | VARCHAR(100) | NN |
| email | VARCHAR(255) | NULL, UNIQUE `uq_participants_email` |
| avatar_color | VARCHAR(20) | NULL |
| created_at | DATETIME | NN |

`UNIQUE` on a nullable column: SQL treats `NULL`s as distinct, so many email-less speakers coexist while real emails are deduplicated. **Global table** (no `owner_id`): a person is shared across meetings, identified by email, else by case-insensitive name (`participants/service.py::find_or_create`).

### `meetings`: `meetings/models.py::Meeting` (`TimestampMixin`)

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| owner_id | INTEGER | NN, FK → `users.id` **ON DELETE CASCADE** |
| title | VARCHAR(200) | NN, idx `ix_meetings_title` |
| meeting_date | DATETIME (UTC) | NN |
| duration_ms | INTEGER | NN, default 0 (server default `'0'`) |
| media_url | VARCHAR(500) | NULL (`NULL` → simulated player) |
| source | VARCHAR + CHECK | NN, `ck_meetings_meeting_source` ∈ seed/upload/paste/form |
| platform | VARCHAR + CHECK | NULL, `ck_meetings_meeting_platform` ∈ zoom/google_meet/teams/upload |
| created_at, updated_at | DATETIME | NN |

Indexes: `ix_meetings_owner_date (owner_id, meeting_date)`: ASC on purpose, also serves as the `owner_id` FK index; `ix_meetings_title`.
Relationships (all `cascade="all, delete-orphan"`, `passive_deletes=True`): `participant_links`, `segments` (ordered by `position`), `summary` (uselist=False), `chapters`, `action_items`; plus `tags` via `meeting_tags`.

### `meeting_participants`: association object `MeetingParticipant`

| Column | Type | Constraints |
|---|---|---|
| meeting_id | INTEGER | PK part 1, FK → `meetings.id` CASCADE |
| participant_id | INTEGER | PK part 2, FK → `participants.id` CASCADE, idx `ix_meeting_participants_participant_id` |
| role | VARCHAR + CHECK | NN, default/server default `'attendee'`, `ck_meeting_participants_participant_role` ∈ host/attendee |

Composite PK `(meeting_id, participant_id)`. It is a *class* (not a bare `Table`) because it carries `role`. No `id`, no `created_at`.

### `tags` and `meeting_tags`: `Tag`, and the plain `Table` `meeting_tags`

`tags`: `id` PK, `name VARCHAR(50)` NN **UNIQUE** (`uq_tags_name`), `color VARCHAR(20)` NULL, `created_at`.
`meeting_tags`: `meeting_id` FK → meetings CASCADE (PK part), `tag_id` FK → tags CASCADE (PK part, idx `ix_meeting_tags_tag_id`). No other columns, so a `Table` is enough.
Tags are seeded and filterable by `tag_id` in `GET /meetings`, but **no endpoint creates/assigns tags** (README says so).

### `transcript_segments`: `transcripts/models.py::TranscriptSegment` (`CreatedAtMixin`)

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| meeting_id | INTEGER | NN, FK → meetings CASCADE |
| participant_id | INTEGER | NULL, FK → participants **SET NULL**, idx `ix_transcript_segments_participant_id` |
| speaker_label | VARCHAR(100) | NN (raw label from the file; survives deleting the participant) |
| start_ms | INTEGER | NN, CHECK `ck_transcript_segments_start_ms_non_negative` (`start_ms >= 0`) |
| end_ms | INTEGER | NN, CHECK `ck_transcript_segments_end_after_start` (`end_ms >= start_ms`) |
| text | TEXT | NN |
| position | INTEGER | NN (0-based order within the meeting) |
| created_at | DATETIME | NN |

Indexes/uniques: `UNIQUE(meeting_id, position)` (named `uq_transcript_segments_meeting_id`; also the FK index), `ix_segments_meeting_start (meeting_id, start_ms)`.

### `summaries`: `summaries/models.py::Summary` (`TimestampMixin`), 1:1 with meetings

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| meeting_id | INTEGER | NN, **UNIQUE** (`uq_summaries_meeting_id`), FK → meetings CASCADE |
| overview | TEXT | NN |
| bullet_points | JSON | NN, default `[]` (server default `'[]'`) |
| keywords | JSON | NN, default `[]` |
| generated_by | VARCHAR + CHECK | NN, `ck_summaries_generated_by` ∈ seed/mock/llm |
| created_at, updated_at | DATETIME | NN |

### `chapters`: `Chapter` (`CreatedAtMixin`)

`id` PK; `meeting_id` NN FK → meetings CASCADE; `title VARCHAR(200)` NN; `start_ms INTEGER` NN; `position INTEGER` NN; `created_at`. `UNIQUE(meeting_id, position)` (`uq_chapters_meeting_id`, also the FK index).

### `action_items`: `action_items/models.py::ActionItem` (`TimestampMixin`)

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| meeting_id | INTEGER | NN, FK → meetings CASCADE, idx `ix_action_items_meeting_id` |
| text | VARCHAR(500) | NN |
| assignee_id | INTEGER | NULL, FK → participants **SET NULL**, idx |
| due_date | DATE | NULL (date only, no time zone) |
| is_completed | BOOLEAN | NN, default False, server default `0` |
| completed_at | DATETIME (UTC) | NULL (service sets/clears it only when `is_completed` flips) |
| source_segment_id | INTEGER | NULL, FK → transcript_segments **SET NULL**, idx |
| position | INTEGER | NN |
| created_at, updated_at | DATETIME | NN |

### Cascade summary

| Delete this… | …and this happens |
|---|---|
| a `user` | their `meetings` (and through them everything below) are deleted |
| a `meeting` | its `participant_links`, `segments`, `summary`, `chapters`, `action_items`, `meeting_tags` rows are deleted by the DB |
| a `participant` | `meeting_participants` rows deleted; `transcript_segments.participant_id` and `action_items.assignee_id` → `NULL` |
| a `transcript_segment` | `action_items.source_segment_id` → `NULL` |
| a `tag` | `meeting_tags` rows deleted |

This only works because `PRAGMA foreign_keys=ON` is set on every connection (§4).

## 4. Design choices, explained

**Integer milliseconds (`start_ms`, `end_ms`, `duration_ms`).** Exact, sortable, no float rounding; maps to `HTMLMediaElement.currentTime * 1000`; VTT (`00:01.500`) and JSON seconds convert cleanly. A float seconds column would accumulate rounding error and make binary search comparisons flaky.

**JSON columns (`summaries.bullet_points`, `keywords`).** Ordered, display-only lists that are always read and written together with the summary and never queried individually. A child table would add joins and ordering columns for no benefit. Caveat: SQLAlchemy doesn't track in-place mutation of a plain `JSON` list; the code always **assigns a new list** (`summaries/service.py::update_summary` uses `setattr`). On Postgres this would become `JSONB`.

**1:1 `summaries` table (UNIQUE `meeting_id`).** Regenerating a summary updates one row and never touches `meetings`; the list query stays light (summary is only joined for the preview). `UNIQUE` makes "two summaries for one meeting" impossible at the DB level, which is why regenerate updates in place.

**Enums as TEXT + named CHECK.** SQLite has no enum type. The `CHECK` keeps bad values out even with raw SQL; the Python side uses `StrEnum` so there are no magic strings. Adding a value (e.g. a `manual` `generated_by`) needs a migration (decision 53 is why summary edits keep their `generated_by`).

**`UTCDateTime`.** SQLite stores no time zone, so a plain `DateTime` comes back *naive* and the API would emit `2026-10-01T09:30:00` (ambiguous). The decorator stores naive UTC, returns aware UTC (serialises as `…+00:00`) and *refuses* naive input, so a local-time bug fails loudly at write time. Alembic renders it as plain `sa.DateTime()` (`render_item` in `env.py`) so migrations never import app code.

**`PRAGMA foreign_keys=ON` (and WAL).** SQLite **ignores foreign keys unless enabled per connection**. `database.py::set_sqlite_pragmas` is an engine `connect` listener, so every connection gets it; without it, `ON DELETE CASCADE/SET NULL` silently does nothing. `journal_mode=WAL` lets readers proceed while a writer writes. Tests import the same function for their in-memory engine. (The Alembic engine intentionally does *not* set it; see 02-workflows (f).)

**`position` columns.** Explicit order independent of timestamps (overlapping speech, edits). `UNIQUE(meeting_id, position)` doubles as the FK index.

**Index every FK.** SQLite doesn't index FKs automatically; without an index, `ON DELETE …` scans the child table. Composite indexes whose *leading* column is the FK count (e.g. `(meeting_id, position)`).

**Ownership by join.** Segments and action items have no `owner_id`; their repositories join `meetings` and filter on `Meeting.owner_id`. Someone else's row looks like a missing row (404), so ids can't be probed.

**`speaker_label` + nullable `participant_id`.** Raw transcripts only carry labels; mapping to a person is optional and survives participant deletion.

## 5. Differences between `docs/schema.md` and the code

| Topic | `docs/schema.md` | Code reality |
|---|---|---|
| `segments_fts` (FTS5 virtual table + triggers) | described as a table | **does not exist.** No migration creates it; `GET /search` isn't implemented (decision 25, README, plan). The doc is a plan for the unbuilt bonus. |
| `title` "1–200 chars" | column constraint implied | DB only has `VARCHAR(200)` (SQLite doesn't enforce length). The **1..200** rule is enforced by Pydantic (`Title` in `meetings/schemas.py`). |
| `meeting_date` "indexed for sort/filter" | single index implied | composite `ix_meetings_owner_date (owner_id, meeting_date)`; `schema.md` does describe it under "Indexes". |
| Unique-constraint names | n/a | the naming convention only uses the first column, so `UNIQUE(meeting_id, position)` is named `uq_transcript_segments_meeting_id` / `uq_chapters_meeting_id`. Works, but the name hides `position`. |
| "Every table has `id` and `created_at`" (CLAUDE.md §4) | n/a | `meeting_participants` and `meeting_tags` are pure link tables with a composite PK and no `created_at`. Reasonable; just know it. |
| `updated_at` on mutable tables (CLAUDE.md §4) | n/a | `transcript_segments` is mutable (`PATCH /transcript-segments/{id}`) but has **no** `updated_at`. See 05-interview-qa.md "Things to double-check". |

Everything else (columns, types, nullability, FK actions, indexes, checks) matches.

## 6. Alembic

### What a migration is

A **versioned script that changes the database schema**: `upgrade()` applies it, `downgrade()` reverts it. Alembic records the current revision in a one-row table `alembic_version` inside your database, so it always knows what has been applied. Files live in `backend/alembic/versions/` and chain through `revision` / `down_revision`. This repo has one: `0001_initial_schema.py` (autogenerated, then hand-trimmed: autogenerate rendered each enum `CHECK` three times).

### How it differs from Mongoose

| | Mongoose / MongoDB | SQLAlchemy + Alembic / SQL |
|---|---|---|
| Schema lives in | your app only; the DB is schemaless | the database itself (tables, columns, constraints) |
| Changing a model | edit the schema; old docs just lack the field | you **must migrate** the DB, or queries fail |
| Source of truth | the Mongoose model | the *migration history* is what built the DB; the models are what you *want* |
| Existing data | handled in code (defaults, lazy migration) | the migration decides defaults/backfills |
| Rollback | n/a | `downgrade()` |

Mental model: **models = desired state; migrations = how to get from the old state to it.** `alembic revision --autogenerate` diffs the models against the live DB and drafts the migration; you must **read and fix it**.

### Project specifics

- `alembic/env.py` imports `app.models` (so `Base.metadata` is complete) and `settings.DATABASE_URL`.
- **`render_as_batch=True`**: SQLite can't `ALTER` most things; batch mode creates a new table, copies rows, drops the old, renames. That's why every constraint has a stable name (`NAMING_CONVENTION`).
- **Migrations never import app code** (`render_item` maps `UTCDateTime` → `sa.DateTime()`), so refactoring the app can't break an old migration.
- **Never edit an applied migration** (CLAUDE.md §4): add a new one.
- **Drift test**: `tests/test_migrations.py::test_migrations_match_models` upgrades an empty DB to head, runs `alembic check` (fails if models ≠ migrations), then downgrades; `test_upgrading_twice_is_a_no_op` guards `start.sh`.
- FTS5 virtual tables and triggers are invisible to autogenerate, so they'd need a hand-written migration.

### How to add a column (worked example: `meetings.location`)

1. **Edit the model** (`meetings/models.py`):
   ```python
   location: Mapped[str | None] = mapped_column(String(200))
   ```
   Nullable, so existing rows are valid. (For `NOT NULL` you must also give a `server_default`, or SQLite batch copy fails on existing rows.)
2. **Generate**: `cd backend && alembic revision --autogenerate -m "add meeting location"`. The post-write hooks in `alembic.ini` format it with black + ruff.
3. **Review the new file** in `alembic/versions/`: expect
   ```python
   with op.batch_alter_table("meetings", schema=None) as batch_op:
       batch_op.add_column(sa.Column("location", sa.String(length=200), nullable=True))
   ```
   and a matching `drop_column` in `downgrade()`. Remove anything unrelated (autogenerate can be noisy).
4. **Apply**: `alembic upgrade head`.
5. **Check**: `pytest tests/test_migrations.py` (no drift) and the rest of the suite.
6. **Wire it through**: `schemas.py` (`MeetingCreate`/`MeetingDetail`), service mapping (`_to_detail`), frontend `types.ts`, and update `docs/schema.md` + `docs/api.md` in the same commit (CLAUDE.md §8.4).

Useful commands: `alembic current`, `alembic history`, `alembic downgrade -1`, `alembic upgrade head --sql` (print SQL instead of running it), `alembic stamp head` (mark a DB as up to date **without** running migrations; only if the schema is known to match).
