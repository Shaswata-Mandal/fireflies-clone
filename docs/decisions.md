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
31. **LLM provider is Groq through the official `groq` SDK** (supersedes the earlier Grok/`openai` choice; see
    decision 110). Model name comes only from `settings.LLM_MODEL` (default `openai/gpt-oss-20b`).
32. **Generator takes plain dataclasses and returns indices, not IDs** — `SegmentInput` in,
    `source_segment_index` (position in the input list) out, so the util has no DB/ORM knowledge; the
    service maps index → `transcript_segments.id`. LLM action items with a missing/out-of-range index or an
    unknown assignee are kept with `None` for that field rather than dropped (the DB columns are nullable).
33. **LLM generator never raises** — any failure (timeout, API error, bad JSON, schema mismatch) logs a
    warning and returns the mock's result, so summaries always exist. `max_retries=0` + 30 s timeout (in `llm_client`)
    keeps a bad key from stalling a request. Long transcripts keep head and tail, dropping the middle with a marker.
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
    the meeting is created without a summary. `generated_by` is `llm` when `GROQ_API_KEY` is set, else `mock`; the
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
62. **Library view state lives in the URL** (`?view=&q=&participant_id=&date_from=&date_to=&sort=&page=`) — reload,
    Back and shared links restore the exact view; no Context/useState copy that can drift. Parsing/serializing is one
    pure file (`modules/meetings/url-state.ts`): malformed values fall back to defaults (never a 422 from a hand-edited
    URL) and defaults are omitted, so the plain view is just `/meetings`. Any change but `page` resets to page 1.
63. **push for discrete changes, replace for typing** — filter/sort/tab/page push a history entry so Back undoes them;
    the debounced search replaces it, otherwise Back would step through "r", "ro", "roa"…
64. **`keepPreviousData` + dimmed list** — changing a filter keeps the old page on screen (opacity 60%, `aria-busy`)
    until the new one arrives, instead of flashing a skeleton. The skeleton only shows on the very first load.
65. **Numbered pages, not infinite scroll** — screenshot 09 implies infinite scroll ("You've reached the end…"), but
    `?page=` must mean something on reload. The end-of-list caption is kept on the last page.
66. **Stretched link for rows** — the title `<Link>` gets an `::after` overlay covering the card, so the whole card is
    a real link (Tab, Enter, middle-click, "open in new tab") while ⋯/Details sit above it (`z-10`). Wrapping the card
    in `<a>` would nest buttons inside a link, which is invalid HTML and breaks keyboard behaviour.
67. **My / All Meetings both query the same endpoint** — there's no sharing model (out of scope), so the tabs mirror
    09/13 visually (All hides "Hosted by me | Shared with me", which toast "Coming soon"). `view` is in the URL so the
    tab survives reload; it isn't sent to the API.
68. **Filter popover shows only API-backed filters** — Participants (single-select: the API takes one
    `participant_id`) and Date Range (native `<input type="date">`, no date-picker dependency). Hosted by, Duration,
    Captured From and Privacy from screenshot 10 have no API parameter, so they're omitted rather than faked. The
    participant search filters the cached list client-side (≤ 100 rows). Date bounds are whole UTC days (decision 42).
69. **Details popup fetches `GET /meetings/{id}` lazily** — list items carry no email/role, which screenshot 12 shows.
    `useMeeting(id, enabled=open)` only runs while the dialog is open and seeds the cache the detail page will use.
70. **Locale dates without hydration mismatches** — dates use `Intl` with the viewer's locale/time zone. The list is
    fetched on the client, so the server only ever renders the skeleton; no server-formatted date can disagree with
    the browser's. Day headings group by *local* calendar day.
71. **Shadcn Dialog vendored, no new dependency** — built on the `radix-ui` package already installed; gives Esc,
    focus trap and focus return for the details popup.
72. **No frontend test runner yet** — `formatDuration`, `url-state.ts` and `groupMeetingsByDay` are pure functions
    written to be unit-tested; adding Vitest is a separate decision. *(Superseded by 73.)*
73. **Vitest for pure frontend logic** — the player/transcript slice put its riskiest code (binary search, regex
    escaping, highlight splitting, grouping, time formatting) in pure functions; Vitest runs TS/ESM with no Babel or
    ts-jest setup, Node environment (no jsdom, no component tests). Pinned to v4 with `"overrides": {"vite": "^7"}`:
    Vitest 5 needs `@types/node` ≥ 22, and Vite 8's optional `@vitejs/devtools` peer (which itself peers `vitest@*`)
    crashes npm 10's peer resolver. Alt: Jest — needs a TS/ESM transform setup.
74. **Playback time lives in an external store, not React state** — the clock writes `TimeStore` every animation frame;
    readers use `useSyncExternalStore` with a *derived* snapshot: time rounded down to 100 ms (time label, seek bar →
    ≤ 10 renders/s) or `findActiveSegmentIndex` (transcript → renders only when the line changes). React skips the
    render when the snapshot is unchanged. `PlayerContext` (controls + isPlaying/rate/duration) and
    `PlayerTimeContext` (the store, never changes identity) are separate so time never re-renders control consumers.
    Blocks/lines are `React.memo` with primitive props; only the blocks containing the old/new active line (or the
    current match) get different props. Alt: a second context for time — every consumer re-renders on every publish.
75. **One `PlayerEngine` interface, two clocks** — `useSimulatedClock` (rAF; advances by real elapsed time × rate, so
    speed is exact and a throttled tab catches up; `play()` at the end restarts like `<video>`) and
    `useMediaElementClock` (element is the source of truth via play/pause events; an rAF loop copies `currentTime`
    because `timeupdate` is only ~4 Hz). Both hooks always run (hooks can't be conditional); the provider drives one.
    The provider is mounted by the page, so navigating away unmounts it and the cleanups pause playback.
76. **Active line in silences** — `findActiveSegmentIndex` = last segment with `start_ms ≤ t`: before the first segment
    nothing is active; in gaps and after the last segment the previous line stays highlighted (no flicker).
77. **Manual-scroll detection by intent events** — wheel, touchmove, scroll keys and scrollbar pointerdown suspend
    auto-follow for `AUTO_SCROLL_PAUSE_MS` (3 s). `scroll` itself can't be used: our own smooth scrolling fires it.
    Scrolling uses `container.scrollTo` (not `scrollIntoView`, which also scrolls the page) and honours
    `prefers-reduced-motion`. Jumping to a search match counts as manual so auto-follow doesn't undo it.
78. **Search cursor resets without an effect** — the cursor stores `{ matches, index }`; a new match list means index 0
    (derived during render), avoiding setState-in-effect. Clearing applies immediately; typing waits 200 ms.
    Matches are non-overlapping (regex `g` semantics) and highlighting is built from text parts, never innerHTML.
79. **Media element always mounted** — hiding the video panel only hides it (CSS), so toggling "Video" never pauses or
    resets playback. No native controls: the PlayerBar is the single control surface.
80. **Detail layout deviations from 17/18/22** — the Smart Search filter column and AskFred tab are omitted (out of
    scope); the ⋯ menu sits next to the title rather than in the navbar breadcrumb (keeps the global navbar free of page
    data); screenshot 22 shows the seek hover bubble, not a speed menu, so the speed menu is designed to match the
    other dropdowns. Active-line/`<mark>` colours have no reference (colors.md §1.10) and use existing primary tints.
81. **CORS `expose_headers=["Content-Disposition"]`** — cross-origin JS can't read non-safelisted headers, so the
    export filename (slugified on the server) would be invisible; the client falls back to `meeting-<id>.<format>`.
    Export is a mutation (user action, nothing to cache); the file is saved via a temporary object URL.
82. **Notes tabs live in the column left of the transcript** — in 17/20/24–26 Fireflies has an icon rail (Smart Search,
    Soundbite, Discussion, Bookmarks), a centre "Notes | AI Skills" toggle and a right AskFred | Transcript panel. No
    screenshot shows a filled summary, action item or outline (colors.md §1.10), so only the empty state (copy verbatim),
    the 17.1 skeleton and the toggle/underline styles are copied; the populated layout is designed from existing tokens.
    One segmented tablist holds Summary · Action Items · Outline, then AI Skills · Soundbites · Discussion · Bookmarks as
    "Coming soon" panels; the right panel gains an AskFred "Coming soon" tab (updates 80). No icon rail is built.
83. **`?tab=` uses `router.replace`** — refines 63: arrow keys move through tabs one by one, and each step shouldn't be a
    Back-button entry. Other params (`?t=`) are preserved; the default tab is omitted; unknown values fall back to Summary.
84. **One generic `TabList`** (shared/components) implements the WAI-ARIA tabs pattern once (roving tabindex, ←/→/Home/End,
    automatic activation) for both tablists; the key → index logic is a pure, tested function.
85. **Action items have their own top-level query key** (`["action-items", "meeting", id]`), not nested under the
    meeting detail: a summary edit invalidates the meeting without refetching action items, and the future "my tasks"
    list can sit under `["action-items"]`.
86. **Summary has no query of its own** — it arrives with `GET /meetings/{id}`, so the summary mutations write their
    response into that cache entry (`setQueryData`) and then invalidate it with `exact: true` (the transcript key is
    nested under the detail key and didn't change).
87. **Regenerate sends `include_action_items: true`** — the server appends newly extracted items (deduped), so the
    action-items query and the library list (open count, summary preview) are invalidated afterwards.
88. **Optimistic toggle and delete, pessimistic add and edit** — `onMutate` cancels in-flight refetches, snapshots and
    patches the cache; `onError` restores the snapshot; `onSettled` refetches. Each row calls its own mutation hooks,
    so `isPending` disables only that row. Item mutations opt out of the global error toast so a 404 (deleted in
    another tab) can say "no longer exists"; a 404 on delete keeps the item removed instead of rolling back.
89. **Forms are strings in, API payload out** — zod schemas accept what inputs produce (`""` for "Unassigned" / no date)
    and transform to the API shape (`null`), so clearing an assignee sends `assignee_id: null`. Summary bullets are a
    textarea (one per line) and keywords a comma-separated input; lists are validated with `refine` so the error lands
    on the field. A disabled `<fieldset>` locks every control while saving (no double submits).
90. **Summary edit limits added to the backend** — `SummaryUpdate` had no max lengths; the frontend needed one, so both
    sides now share: overview 5000, bullet 500, keyword 50, 20 keywords (docs/api.md).
91. **"Overdue" is computed at render time** — `isOverdue(item, now)` compares the `YYYY-MM-DD` due date with the
    viewer's local date (`now` injected for tests). Due dates are formatted in UTC so a date-only value never shifts a day.
92. **Active chapter reuses the transcript's binary search** — "last start ≤ t" is the same rule, so
    `findActiveChapterIndex` delegates to `findActiveSegmentIndex`, and `useActiveChapterIndex` uses the same
    `useSyncExternalStore` index snapshot, re-rendering only when the chapter changes.
93. **`color-scheme: dark` on `.dark`** — native controls (date picker icon, checkboxes, select popup) otherwise render
    light-theme glyphs on dark surfaces.
94. **The create form is built from the brief, not the screenshots** — 27/28 show Fireflies' audio/video upload (a Capture
    menu and a drop zone, no tabs or fields), 29 an info toast without an action. We keep their look (dashed drop zone,
    "Browse Files", toast surface/border) but the clone uploads transcripts, so the navbar button became "Upload" and
    opens a modal; the dropdown row reads "Upload transcript". The dashed border got its own token (`--border-dropzone`).
95. **One form, three tabs** — a single react-hook-form instance holds every tab's fields so switching tabs keeps title,
    date and participants; `superRefine` requires only the active tab's field (file / transcript text). The modal and
    `/uploads` render the same `CreateMeetingForm`; the modal's state sits in its own `CreateMeetingContext` (not
    `UIContext`, which is layout chrome only).
96. **Client validation mirrors the backend** (`MAX_UPLOAD_BYTES` 2 MiB, `.txt/.vtt/.json`, title ≤ 200, name ≤ 100) so
    the common failures never cost a round trip, but backend errors are still mapped inline (`mapCreateError`): parse
    errors on the file / textarea with the line number, `VALIDATION_ERROR` on the named field or a banner. The global
    toast still fires too; we added no second toast.
97. **Dates cross the boundary in one place** — `datetime-local` has no zone, so `localInputToIso` / `isoToLocalInput`
    are the only converters; the API always gets UTC ISO.
98. **PATCH sends only what changed** (`buildMeetingPatch`): dates compare as instants, participants as a set by
    name + email. No change → no request. The PATCH response (a full `MeetingDetail`) is written into the detail cache.
99. **Delete is optimistic in the library, pessimistic on the detail page** — the hook removes the row from every cached
    list page (and decrements `total`) and rolls back on error. On success it `removeQueries` the meeting's detail and
    action items instead of invalidating them: an open detail page would otherwise refetch a 404 and flash "not found".
    The detail page pauses the player first and navigates after the server confirms.
100. **Dialogs live outside the dropdown** — Rename / Edit / Delete set state in the row / header component and the
    dialogs render beside the menu, so they survive the menu unmounting. A `returnFocusRef` sends focus back to the ⋯
    trigger on close, because the menu item that opened the dialog no longer exists.
101. **`ConfirmDialog` is shared** — the action-item delete became a thin wrapper. It is not dismissable while pending;
    the create and edit modals use the same Esc / outside-click guard.
102. **Migrations run on every boot, in the start script** — `alembic upgrade head` is a no-op at head, so there is no
    "first deploy" special case, and a failing migration stops the script (`set -e`) so the deploy fails instead of
    serving a half-migrated schema. Seeding stays inside the app lifespan (`SEED_ON_STARTUP` + empty DB) so the same
    rule applies under `uvicorn --reload` and in tests.
103. **Two health endpoints** — `/health` is liveness and touches nothing (the host polls it often); `/health/db`
    runs `SELECT 1` and returns a 503 in the standard error envelope. A DB problem should not make the host restart-loop
    a process that is otherwise fine, which is why the host's check points at `/health`.
104. **CORS: exact list plus an optional regex** — `CORS_ORIGINS` (JSON list) for known origins, `CORS_ORIGIN_REGEX` for
    Vercel preview URLs whose host changes per deploy. A blank env value counts as unset, so `.env.example` can list it.
105. **SQLite parent directory is created in `database.py`** — it runs at import, before the engine and before Alembic
    (which imports `Base` from there), so one call covers both the app and migrations on a freshly mounted `/var/data`.
106. **Access log is a pure ASGI middleware** — `BaseHTTPMiddleware` buffers/streams the response and has known problems
    with exceptions and background tasks; observing `http.response.start` needs neither. The request id lives in a
    `ContextVar` so a log filter can add it to every line, including those from services. uvicorn's own access log is
    switched off in `start.sh` to avoid logging each request twice.
107. **`requirements.txt` is runtime only** — `requirements-dev.txt` includes it and adds pytest, httpx (TestClient),
    ruff and black. The host installs the smaller file; CI and developers install the dev one.
108. **Python 3.12 on the host, ruff/black target `py311`** — 3.12 is what Render is pinned to and what we develop on;
    the lint target stays at the project's minimum supported version (3.11).
109. **Frontend build fails without `NEXT_PUBLIC_API_URL`** — only when `NODE_ENV=production`. `next.config.ts` imports
    `shared/lib/env.ts` so the check runs at the very start of `next build`; a silent localhost fallback would ship a
    site that "builds fine" but cannot reach its API. Development keeps the localhost default.
110. **One LLM door: `utils/llm_client.generate_text`** — mirrors the Node helper used in an earlier project
    (optional system message, prior turns mapped to user/assistant, final user prompt, temperature 0.7). The
    SDK is pinned (`groq==1.7.0`) and built with `max_retries=0` so a 429 is surfaced, not silently retried.
111. **Provider errors become `AppException`s inside the client** — HTTP 429 → `LLM_RATE_LIMITED` (429,
    `details.retry_after` = 60, a constant like the Node helper, not the provider header), any other failure →
    `LLM_ERROR` (502), no key → `LLM_NOT_CONFIGURED` (503). Only the exception type and HTTP status are logged:
    never the key, prompt or transcript text. Summary generation catches all of them and falls back to the mock;
    "ask" lets them through so the user sees why there is no answer.
112. **Ask has no repository** — the module reads segments through `transcripts.service.list_segments` (which also
    enforces ownership → 404 for another user's meeting), so a repository would only duplicate that query.
113. **Citations are parsed server-side** — the model is told to cite `[s:<segment id>]`; the service strips the tags
    from the answer and returns `citations` only for ids that exist in *this* meeting (invented or foreign ids are
    dropped, duplicates collapsed, first-mention order kept).
114. **Ask prompt budget = 24 000 characters** — if the transcript is longer, keep the segments sharing the most
    words with the question plus their neighbours (±1); with no keyword hit, alternate from start and end.
    Gaps get a `[...]` marker. History is trimmed to the last 6 messages.
115. **Home AskFred = `POST /ask` over the 20 newest meetings** — same Groq client, prompt budget and citation
    validation as the per-meeting ask; lines carry the meeting title and citations carry `meeting_id` so the UI
    links to `/meetings/{id}?t=<ms>`. No retrieval index: keyword overlap is enough for a demo-sized library.
