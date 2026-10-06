# Decision Log

Add an entry whenever a non-obvious choice is made. These are your interview answers.
Format: **Decision** — why — alternatives considered.

1. **No auth provider (Clerk etc.)** — spec says assume a default logged-in user. `get_current_user()`
   dependency returns the seeded user, so real auth (JWT/Clerk) is a one-function swap.
   Alt: Clerk — adds a sign-in wall for evaluators and hours of setup for no graded value.
2. **SQLite** — required by spec. SQLAlchemy keeps it portable; Postgres = change `DATABASE_URL`.
3. **FastAPI over Django** — async-ready, Pydantic validation and OpenAPI docs for free, lighter for a
   pure JSON API. Django's admin/ORM/templates aren't needed.
4. **Layered modules (router → service → repository)** — each layer has one reason to change; services
   are testable without HTTP; repositories isolate SQL. Mirrors the controller/service/model pattern
   from my MERN guideline.
5. **Integer milliseconds for timestamps** — exact, sortable, matches `HTMLMediaElement.currentTime * 1000`.
6. **Summary as a separate 1:1 table** — regenerate without touching the meeting row; keeps list query light.
7. **JSON columns for keywords/bullets** — always read/written as a whole, never filtered on.
8. **Mock + LLM summary generators behind one interface** — app works with no API key (Strategy pattern).
9. **TanStack Query instead of Context+useReducer for server data** — caching, invalidation, loading/
   error states, optimistic updates built-in; Context kept for UI state only.
10. **Transcript search client-side** — whole transcript is already loaded for the player; instant
    feedback, no extra requests. Global search is server-side (FTS5) because data spans meetings.
11. **Simulated player when no media** — spec allows placeholder media; a rAF clock keeps sync
    behaviour identical to a real `<audio>` element behind the same `usePlayer` interface.
12. **Constraint naming convention + Alembic `render_as_batch`** — SQLite can't `ALTER` columns or
    constraints; batch mode recreates the table, which needs every constraint to have a stable name.
    Alt: hand-written table-copy migrations — error-prone.
13. **Sync SQLAlchemy, session per request, `check_same_thread=False`** — FastAPI runs sync deps in a
    threadpool, so a connection may cross threads; safe because sessions are never shared between
    requests. Alt: async SQLAlchemy + aiosqlite — more moving parts, no real gain on SQLite.
14. **Theme tokens via Tailwind v4 per-utility namespaces** — raw CSS variables per theme (`:root` /
    `.dark`), exposed as `--background-color-page`, `--text-color-secondary`, `--border-color-default`.
    Tailwind checks those before `--color-*`, so classes read `bg-page`, `text-secondary`,
    `border-default` (as CLAUDE.md specifies) without clashing with shadcn's `secondary`/`muted`.
    shadcn's own variables are aliased onto our tokens, so its primitives match the theme for free.
    Dark values are measured from screenshots; the light block is guessed and fenced off for replacement.
    Alt: one flat `--color-*` namespace — forces names like `text-text-secondary` or collides with shadcn.
15. **Interceptor normalises, MutationCache toasts** — the axios interceptor turns every failure into
    one `ApiError` (`status`, `code`, `message`, `details`) but shows nothing. Mutation errors are toasted
    once in `MutationCache.onError` (opt-out via `meta.suppressErrorToast`); queries show inline error
    states instead. Alt: toast in the interceptor — double toasts and toasts for background refetches.
16. **`UTCDateTime` column type** — SQLite stores no timezone, so plain `DateTime` reads back naive and
    the API would emit ambiguous `2026-10-01T09:30:00`. The TypeDecorator stores naive UTC, returns
    aware UTC (serialises with `+00:00`), and *rejects* naive input so a local-time bug fails loudly
    at write time. Alt: convert in every Pydantic schema — easy to forget in one place.
17. **Enums as TEXT + named CHECK (`native_enum=False`)** — SQLite has no enum type; the CHECK keeps bad
    values out even for raw SQL. Python side uses `StrEnum` (no magic strings). Autogenerate rendered
    each enum CHECK three times, so migration 0001 was hand-trimmed to the one `sa.Enum` creates.
18. **`passive_deletes=True` on owned children** — the DB's `ON DELETE CASCADE` deletes segments etc.;
    without it SQLAlchemy would `SELECT` every segment of a meeting just to delete them one by one.
    `cascade="all, delete-orphan"` is kept so removing a child from a collection still deletes it.
19. **Index every FK** — SQLite doesn't auto-index FKs; without one, `ON DELETE SET NULL/CASCADE` on a
    participant or segment scans the whole child table. Composite indexes whose leading column is the FK
    (`(meeting_id, position)`, `(owner_id, meeting_date)`) double as the FK index.
20. **`(owner_id, meeting_date)` ASC, not DESC** — SQLite walks a B-tree index backwards for
    `ORDER BY meeting_date DESC` at the same cost, and a DESC index is an expression index Alembic
    can't reflect (it would warn on every autogenerate and escape the drift test).
21. **Migrations never import app code** — `render_item` in `env.py` renders `UTCDateTime` as plain
    `sa.DateTime()` (identical on disk), so refactoring app code can't break an applied migration.
22. **Migration drift test** — `tests/test_migrations.py` upgrades an empty DB to head and runs
    `alembic check`; a model change without a migration fails CI instead of failing in production.
23. **Model registry (`app/models.py`)** — one import registers every table on `Base.metadata`;
    Alembic, tests and `main.py` use it, so string relationships (`"Participant"`) always resolve.
24. **`get_current_user` goes through `users.service`** — even a fake-auth dependency respects
    deps → service → repository; a missing default user raises `USER_NOT_FOUND` (DB not seeded)
    instead of a 500 on `None`.
25. **FTS5 `segments_fts` deferred to the global-search slice** — virtual tables and their sync triggers
    are invisible to autogenerate, so they get their own hand-written migration when search is built.
26. **Own ~60-line VTT parser, `webvtt-py` removed from requirements** — the library has its own error type
    (no line numbers in our envelope), requires `HH:MM:SS` (rejects `MM:SS.mmm`), doesn't know the
    `Name:` speaker-prefix convention, and we'd still post-process every cue. Own code gives line numbers.
27. **Parser raises `AppException` subclasses directly** — `utils/transcript_parser.py` imports
    `core/exceptions.py`, so FastAPI is a *transitive* import (no direct FastAPI/DB use, still unit-testable
    without either). Cheaper than duplicating the exception hierarchy.
28. **`end_ms` fallback** — missing end = next segment's start (after sorting); last segment =
    `start + DEFAULT_LAST_SEGMENT_MS` (5 s). Sort is stable so equal starts keep file order. Segments with
    empty text are dropped; a file left with none raises `EMPTY_TRANSCRIPT`.
29. **JSON errors cite the array position** (`details: {"segment": n}`) because JSON has no meaningful lines;
    TXT/VTT/JSON-syntax errors use `details: {"line": n}`. Numeric strings and booleans are rejected as times.
30. **`detect_format` is strict about extensions** — a known extension wins; an unknown one (`.pdf`) is
    `UNSUPPORTED_FILE` even if the content looks like a transcript; content sniffing only runs when the
    filename has no extension (e.g. pasted text). TXT is sniffed before JSON because both can start with `[`.
31. **LLM provider is Grok (xAI) through the `openai` SDK, not Anthropic** — xAI's API is OpenAI-compatible,
    so the only new pieces are the `openai` dependency (replaces `anthropic`, which was unused) and
    `LLM_BASE_URL`. Model name still comes only from `settings.LLM_MODEL`; swapping provider = env change.
32. **Generator takes plain dataclasses and returns indices, not IDs** — `SegmentInput` in,
    `source_segment_index` (position in the input list) out, so the util has no DB/ORM knowledge; the
    service maps index → `transcript_segments.id`. LLM action items with a missing/out-of-range index or an
    unknown assignee are kept with `None` for that field rather than dropped (the DB columns are nullable).
33. **LLM generator never raises** — any failure (timeout, API error, bad JSON, schema mismatch) logs a
    warning and returns the mock's result, so summaries always exist. `max_retries=0` + 30 s timeout keeps
    a bad key from stalling a request. Long transcripts keep head and tail, dropping the middle with a marker.
34. **Mock is deterministic by construction** — ties in word frequency break alphabetically, chapters are
    equal *time* windows (empty windows skipped, so short transcripts get fewer chapters instead of fake ones),
    and each chapter bullet quotes the window's longest sentence (first sentences are often just "Yes.").
35. **Seed = validated JSON files + a loader that talks to the session directly** — the seed is a script,
    not an HTTP module, so it skips router→service→repository (a deliberate, documented exception). Files
    are parsed by Pydantic models (`seed/schemas.py`) so the file format is its own spec; *every* file is
    validated before the first insert, so a typo fails fast with the filename and nothing is half-seeded.
    Alt: Python dict fixtures — no validation, harder to review as data.
36. **Participants identified by email across seed files** — the same person repeated in several files
    becomes one `participants` row + several `meeting_participants` rows (what makes the participant
    filter meaningful). A mismatching name/colour for one email is a validation error.
    `source_segment` in a file is a segment *index*; SQLAlchemy relationships resolve it to a DB id.
37. **Idempotent by "no meetings" check; default user ensured separately** — `get_current_user` needs
    user id=1 even if meetings exist, so the user is created first, then seeding is skipped if any
    meeting exists. Runs on startup via FastAPI `lifespan` when `SEED_ON_STARTUP`; tests set it false.
