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
38. **Meeting create has one code path** — `POST /meetings` and `POST /meetings/upload` both end in
    `service._create`; the upload route only adds file checks (extension → size → UTF-8 → parse). The whole graph
    (meeting, participants, segments, summary, chapters, action items) is built in memory, flushed, then committed
    once; any exception rolls back, so no orphan participants either. Helpers `flush`, only the public service
    functions `commit`.
39. **Oversize upload = 413 `FILE_TOO_LARGE`** (added to `docs/api.md`), not 400 — it's a different client fix
    than a wrong file type. The route reads `MAX_UPLOAD_BYTES + 1` bytes: one extra byte proves oversize without
    buffering an unbounded body.
40. **List query: EXISTS for participant/tag filters, scalar subquery for `action_items_open`** — a JOIN could
    return a meeting twice and inflate `total`; the correlated subquery computes open counts inside the page query.
    With `selectinload` the list costs a constant number of queries (count + page + participants + participant rows +
    tags + summary), asserted by a test that compares 6 vs 12 meetings. `id DESC` tiebreaker keeps pagination stable.
41. **Sort is a whitelist enum, LIKE input is escaped** — `sort` is a `StrEnum` (FastAPI answers 422 for anything
    else) mapped to prebuilt ORDER BY expressions; `q` escapes `\`, `%`, `_` and uses `ILIKE ... ESCAPE`.
    Title sort is `lower(title)` so it's not case-sensitive.
42. **Date filters are whole UTC days** — `date_from` → `>= 00:00Z`, `date_to` → `< next day 00:00Z`, so a meeting at
    23:59:59 on `date_to` is included. Request datetimes must be timezone-aware and are normalised to UTC in the
    schema, so responses never echo a client offset.
43. **Other users' meetings are 404** — every read goes through `get_owned(owner_id, id)`, so "not yours" and
    "doesn't exist" are indistinguishable (no id probing).
44. **Participants are global, matched by email else by name** — the schema has no owner on `participants`, so
    find-or-create is email-first (emails are unique), falling back to a case-insensitive name match for
    email-less speakers. The first supplied participant is `host`; transcript-only speakers are `attendee`; the
    `Unknown` speaker gets no participant (the label is kept on the segment). Avatar colour = crc32(name) % palette,
    stable across processes (unlike `hash()`).
45. **PATCH participants = diff, not delete-all/insert-all** — links for people who stay are reused (keeps roles,
    avoids a delete+insert of the same composite PK in one flush); removed ones are dropped by `delete-orphan`.
    `updated_at` is bumped by hand since link-only edits don't touch the meetings row.
46. **Summary failure is non-fatal; `generated_by` is by config** — the generator call is wrapped so a failure logs and
    the meeting is created without a summary. `generated_by` is `llm` when `LLM_API_KEY` is set, else `mock`; the
    LLM generator's internal fallback to the mock is not reported by the util, so it is still labelled `llm`.

47. **PATCH null handling via `model_fields_set`** — "field not sent" and "sent as null" are different intents
    for `assignee_id` / `due_date` (unassign / clear), so the service checks `model_fields_set`. A validator
    rejects `null` for fields that cannot be empty (`text`, `is_completed`, segment/summary text), so the DB
    never sees a NOT NULL violation. Alt: sentinel default values — less readable in Pydantic.
48. **`completed_at` only changes when `is_completed` flips** — re-sending `true` keeps the original completion
    time; `false` clears it. The service owns it (not a DB trigger) so the rule is testable and visible.
49. **Cross-user access is 404, via a join on `meetings.owner_id`** — segments and action items have no owner
    column, so their repositories join `meetings` and filter by owner. Missing and foreign rows are
    indistinguishable, so ids can't be probed.
50. **Regeneration updates the summary row in place and re-inserts chapters** — `summaries.meeting_id` is UNIQUE
    so a second row is impossible; chapters are bulk-deleted and flushed before the inserts because of
    UNIQUE(meeting_id, position). All inside one transaction: a generator failure keeps the old summary.
51. **Action-item dedupe on append** — key = `text.strip().casefold()` against existing items and earlier items
    in the same batch; new items go after `max(position)`. Manual items are never overwritten by regeneration.
52. **`builder.py` is a DB-free module, not a service** — meetings (create) and summaries (regenerate) both
    turn generator output into ORM objects; a shared service would create an import cycle
    (summaries → meetings for ownership checks). `exports` is its own module for the same reason.
53. **Manual summary edits keep `generated_by`** — the enum and its DB CHECK only allow `seed | mock | llm`;
    adding `manual` needs a migration. Revisit if the UI should show an "edited" badge.
54. **Export formatting is a pure function** — `utils/export_formatter.py` takes plain dataclasses, so output is
    unit-tested without a DB; the service only flattens ORM rows. Filenames are ASCII-slugified (also stops
    header injection / path tricks via the title).
55. **Sidebar follows the screenshots, not the CLAUDE.md §6 list** — 01/02 show Home, AskFred | Meetings, Tasks,
    AI Skills | Analytics, Voice Agents | Upgrade, then Integrations, Settings; no Uploads or Team. Uploads is
    reached via the Capture button, Team via the avatar menu. Out-of-scope items (AI Skills, Voice Agents,
    Upgrade, Email Assistant) are buttons with a "Coming soon" toast, so nothing is a dead link.
56. **Nav items are data (`constants/navigation.ts`)** — the desktop sidebar and the mobile drawer render the
    same `<Sidebar>` from one list, so they can't drift. Active state = `usePathname` + `isRouteActive`
    (Home exact, others prefix so `/meetings/12` highlights Meetings).
57. **Radix (via shadcn) for menus, popovers, tooltips and the drawer** — Esc to close, focus return to the
    trigger, arrow-key navigation and the drawer's focus trap are hard to get right by hand. shadcn files keep
    their kebab-case names in `ui/` (vendored code); our components are PascalCase.
58. **Sidebar collapse persisted in localStorage, applied after mount** — the server can't read storage, so
    reading it during render would cause a hydration mismatch. Cost: a collapsed sidebar renders expanded for
    one frame. All storage access goes through `utils/safe-storage.ts` (try/catch; private mode / blocked
    storage just means "not remembered"). Alt: a cookie read on the server — more moving parts for a demo.
59. **Notifications are client-only mock state** (`constants/notifications.ts` + `useNotifications`) — no table or
    endpoint exists (out of scope). The hook returns the shape a TanStack Query hook would, so a real API
    later changes one file. Badge is a count pill (screenshot shows a plain dot) so read/unread is visible.
60. **Billing and promo UI left out** — "3 Free meetings", plan/storage bars, the avatar menu's app-download
    column and the notifications desktop-app footer would be fake data or Fireflies brand assets. Upgrade
    buttons stay (visual parity) and toast "Coming soon".
61. **AskFred is UI only** — dock on Home (07), panel anywhere (06/15). `AppShell` owns a `hasAskedFred` flag
    shared by both, so asking from the dock opens the panel and shows the "coming soon" note there.
    The collapsed rail gets an avatar-only account trigger (02 has none, which would make the menu unreachable).
