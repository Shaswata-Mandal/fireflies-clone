# 05 — Interview Q&A (40 questions)

Answers are short on purpose: say the one-sentence version first, then add detail only if asked. Every answer points at real code. Decision numbers refer to `docs/decisions.md`. Items marked **(new)** are decisions that were **missing** from `decisions.md`; they are collected in §"Decisions to add to decisions.md" at the end.

---

## A. Big picture

**1. Walk me through the architecture in 30 seconds.**
Two deployables. A Next.js app on Vercel; all data fetching happens in the browser through TanStack Query and one axios client. A FastAPI service on Render with the layering `router → service → repository → SQLAlchemy → SQLite`. Each backend feature is a module with the same five files. Errors share one JSON envelope; the optional LLM sits behind one function (`utils/llm_client.generate_text`) and the app works fully without it.

**2. Why did you split the backend into router / service / repository?**
Each layer has one reason to change: HTTP shape, business rules, SQL (decision 4). Services are testable without HTTP, repositories isolate queries, routers stay one-liners (`return service.update_item(...)`). It also makes ownership rules (e.g. `get_owned_or_404`) live in exactly one place. Trade-off: more files and some pass-through functions (e.g. `delete_item`).

**3. Why FastAPI instead of Express or Django?**
Pydantic gives validation + typed request/response models + OpenAPI docs (`/docs`) for free; it's lighter than Django for a pure JSON API (no admin/templates needed); and Python fits the LLM/text-processing parts (decision 3). Coming from Express: type hints replace Joi + manual `req.body` handling.

**4. Why Next.js if you don't use server components for data?**
The App Router gives file-based routing, layouts that persist across navigation (the sidebar and the player don't remount), `next/font`, a production build and one-click Vercel hosting. Data is deliberately client-side: one data path (TanStack Query), one cache, and the API is a separate service anyway. Honest trade-off: no server-rendered data, so first paint shows skeletons.

**5. Why SQLite? What would change for Postgres?**
The assignment requires it, and SQLAlchemy keeps the code portable (decision 2). For Postgres: change `DATABASE_URL`, add a driver (`psycopg`), drop the SQLite-only bits (`check_same_thread`, the PRAGMA listener, `render_as_batch` becomes unnecessary), map `JSON` → `JSONB`, and replace `ILIKE`-based title search with trigram/full-text indexes. Re-run migrations on an empty Postgres, and move to a connection pool (`pool_size`). Not tested here, and I'd say so.

## B. Backend design

**6. How do you handle errors consistently?**
Services raise `AppException` subclasses (`NotFoundError`, `ValidationError`, `FileTooLargeError`…). `core/exceptions.py` registers four handlers (app errors, request validation, framework HTTP errors, unhandled) that all return `{"error": {"code", "message", "details"}}`. The frontend's axios interceptor converts that into one `ApiError`, so UI code branches on `code` and `status`, never on strings.

**7. Explain your transaction handling.**
Repositories never commit; they `flush()` so IDs exist. The public service function owns a single `db.commit()` and does `db.rollback()` on any exception (`meetings/service.py::_create`, summaries `generate_summary`). So creating a meeting with participants, segments, summary, chapters and action items is all-or-nothing, with no orphan participants. Session lifetime is per request via the `get_db` dependency's `try/finally`.

**8. How do you prevent N+1 queries?**
`selectinload` on list queries (participants → participant, tags, summary), and the open-items count is a correlated scalar subquery inside the page query. A test asserts the query count is constant: the same 6 queries for 6 or for 12 meetings (decision 40). Lazy loading by default would otherwise issue a query per row.

**9. How does filtering/pagination avoid duplicates and unsafe SQL?**
Participant/tag filters use `EXISTS` instead of `JOIN` so a meeting can't appear twice and inflate `total` (decision 40). Sort is a `StrEnum` whitelist mapped to prebuilt `ORDER BY` expressions: user input only *selects* a key, never reaches SQL. `q` is escaped (`escape_like`) so `%` and `_` are literal. `id DESC` is a tiebreaker so pages are stable. Everything is parameterised by SQLAlchemy.

**10. How do you tell "field not sent" from "field sent as null" in PATCH?**
Pydantic's `model_fields_set`. `ActionItemUpdate` allows `null` only for `assignee_id` and `due_date` (unassign / clear date); a `model_validator` rejects `null` for required fields so the DB never sees a NOT NULL violation (decision 47). `MeetingUpdate` rejects any explicit null.

**11. Why is `completed_at` set in the service and not by a trigger/default?**
It's a business rule ("stamp only when the flag flips; re-sending `true` keeps the original time"): `_apply_completion`. In the service it's visible and unit-testable, and database-agnostic (decision 48).

**12. How does the summary generator work with and without an LLM?**
`get_summary_generator(settings)` returns a `MockSummaryGenerator` (deterministic: word frequency, time-window chapters, regex action items) or `LLMSummaryGenerator(fallback=mock)`. Same `Protocol`, i.e. the Strategy pattern. The LLM one asks for strict JSON, validates it with Pydantic, and on **any** failure logs and returns the mock result, so summaries always exist (decisions 8, 33).

**13. How do you stop the LLM from inventing citations?**
The prompt tags lines `[s:<segment id>]`; the model must cite tags. `prompt.extract_cited_segments` strips tags from the answer and returns citations only for ids that belong to *this* meeting's segments: invented or foreign ids are dropped, duplicates collapsed (decision 113). Trusting model output as links would be a data-leak vector.

**14. How do you fit a long transcript into the LLM context?**
Budgeted prompts. Ask: 24 000 chars; if too long, keep the segments sharing the most words with the question plus ±1 neighbours, or alternate start/end when nothing matches, with `[...]` gap markers (decision 114). Summary: 60 000 chars; keep head and tail, drop the middle with a marker (decision 33). It's keyword overlap, not embeddings; fine for demo-sized data, and the first thing I'd upgrade (RAG).

**15. What happens when the LLM is down, rate-limited or unconfigured?**
`llm_client` maps failures to `AppException`s: no key → `LLM_NOT_CONFIGURED` (503); provider 429 → `LLM_RATE_LIMITED` (429, `retry_after`); anything else → `LLM_ERROR` (502). Summaries swallow them and use the mock; "ask" lets them through and the UI shows an inline notice with Retry (`ask-errors.ts`). The SDK is built with `max_retries=0` and a 30 s timeout so a bad key can't stall a request.

**16. How do you parse transcripts?**
`utils/transcript_parser.py`: `detect_format` (extension wins; sniffing only when there's no extension, e.g. pasted text), then `_parse_txt` / `_parse_vtt` / `_parse_json`, then `_finalize` (stable sort, drop empty text, fill `end_ms` from the next segment, last = +5 s). Own ~60-line VTT parser instead of `webvtt-py` for line-numbered errors and the `Name:` speaker convention (decision 26). Errors carry `details: {line}` or `{segment}`, which the form shows next to the field. It's pure, hence the most heavily unit-tested file.

**17. How do you validate uploads safely?**
Extension whitelist, size cap (2 MiB; the route reads `MAX+1` bytes so oversize is proven without buffering an unbounded body → 413), UTF-8 decode (`utf-8-sig` strips BOM), then parse. The client mirrors these rules so common failures cost no round trip, but the server is the authority.

**18. How is access control done without auth?**
`get_current_user` returns the seeded user id 1, via `users.service` so even fake auth respects the layering. Every read is scoped by owner: meetings directly, segments/action items by joining `meetings.owner_id`. Another user's row looks exactly like a missing one (404), so ids can't be probed (decisions 43, 49). The `api` test fixture creates user 2 specifically to test this.

## C. Database

**19. Walk me through the schema and the cascade rules.**
`users → meetings` (CASCADE); `meetings` owns `transcript_segments`, `chapters`, `action_items`, one `summaries` row and link tables (all CASCADE). References *to people or segments* (`participant_id`, `assignee_id`, `source_segment_id`) are `SET NULL`: deleting a person must never delete what was said or the task (`03-database.md`).

**20. Why integer milliseconds?**
Exact, sortable, no float rounding, maps to `currentTime * 1000`; binary search over `start_ms` stays robust (decision 5).

**21. Why a separate 1:1 `summaries` table, and JSON columns?**
Regeneration touches only that row; the list query stays light; `UNIQUE(meeting_id)` makes duplicates impossible (decision 6). `bullet_points`/`keywords` are JSON because they are always read and written whole and never queried individually (decision 7).

**22. Why does SQLite need `PRAGMA foreign_keys=ON`, and where is it set?**
SQLite ignores FKs by default and the setting is **per connection**. `database.py::set_sqlite_pragmas` is an engine `connect` listener, so cascades and `SET NULL` work for every connection. Without it the DB would silently leave orphans.

**23. Why a custom `UTCDateTime` type?**
SQLite has no timezone storage, so plain `DateTime` returns naive values and the API would emit ambiguous timestamps. The decorator stores UTC, returns aware UTC and rejects naive input so timezone bugs fail loudly (decision 16).

**24. How do migrations work here, and how do you keep them in sync with the models?**
Alembic with `render_as_batch=True` (SQLite can't alter columns), a naming convention so every constraint has a stable name, and migrations that never import app code. `tests/test_migrations.py` upgrades an empty DB to head and runs `alembic check`: a model change without a migration fails CI instead of production (decisions 12, 21, 22). `start.sh` runs `alembic upgrade head` on every boot (a no-op at head).

**25. What indexes did you add and why?**
Every FK, since SQLite doesn't. Composite `(owner_id, meeting_date)` serves "my meetings, newest first" and doubles as the FK index; `(meeting_id, start_ms)` for transcript lookups; `UNIQUE(meeting_id, position)` for ordering. ASC not DESC because SQLite scans a B-tree backwards for free and Alembic can't reflect DESC indexes (decisions 19, 20). Honest note: `ix_meetings_title` can't help `ILIKE '%q%'`.

## D. Frontend

**26. Why TanStack Query instead of Redux / Context + useEffect?**
Server data is a cache, not app state. TanStack gives dedupe, keyed caching, retries, abort, invalidation, loading/error flags and optimistic updates, which I'd otherwise hand-write per component. Context stays for UI chrome only (decision 9).

**27. How do you structure query keys and invalidation?**
`shared/constants/query-keys.ts`: hierarchical arrays. `meetings.lists()` is a prefix of every list; `detail(id)` is a prefix of `transcript(id)`. Action items have a **top-level** key so a summary edit doesn't refetch them (decision 85). Mutations invalidate the narrowest correct prefix, or `setQueryData` when the response already contains the new truth (PATCH meeting, summary).

**28. Explain the optimistic update for toggling an action item.**
`onMutate`: `cancelQueries` (so an in-flight refetch can't overwrite the optimistic value), snapshot the list, patch the cache. `onError`: restore the snapshot and toast. `onSettled`: invalidate so server truth wins either way. Each row owns its mutation hooks, so `isPending` disables only that row. Delete is the same, except a 404 keeps the item removed (decision 88). Add and edit are pessimistic because the server assigns ids and validates.

**29. How does the player sync with the transcript?**
One `PlayerProvider` with a `PlayerEngine` interface and two clocks: a `requestAnimationFrame` simulated clock (no media) or a real `<audio>/<video>` clock. Both write the current time into a `TimeStore` (a plain object outside React). Readers use `useSyncExternalStore` with *derived* snapshots: the active-segment **index** for the transcript, time rounded to 100 ms for the label/seek bar. Clicking a line calls `seek(start_ms)` + `play()`. Active segment = binary search for the last `start_ms ≤ t`.

**30. Why not just `useState` for the current time?**
At 60 updates/s it would re-render the whole transcript constantly. With the store + derived snapshots React compares a number and skips the render unless the active line changed; blocks and lines are `React.memo` with primitive props, so only the old and new active line re-render (decision 74). CLAUDE.md says "PlayerProvider owns currentTimeMs"; this is a deliberate refinement of that.

**31. How does auto-scroll avoid fighting the user?**
It follows the active line, except for 3 s after the user scrolls. "Scrolled" is detected from intent events (wheel, touch, scroll keys, scrollbar pointerdown), not `scroll`, because our smooth scrolling fires `scroll` too. Uses `container.scrollTo`, not `scrollIntoView` (which also scrolls the page), respects `prefers-reduced-motion`, and offers "Jump to current" when the active line is off-screen (decision 77).

**32. Why is the library's state in the URL?**
Reload, Back and shared links restore the exact view, and there's no second copy that can drift. `url-state.ts` is pure: bad values fall back to defaults (no 422 from a hand-edited URL) and defaults are omitted. Typing uses `router.replace` (else Back walks through "r","ro","roa"), discrete changes use `push`. Any change except `page` resets to page 1 (decisions 62, 63).

**33. How do forms and validation work on the frontend?**
react-hook-form + zod. One form instance holds all three create tabs' fields, and `superRefine` requires only the active tab's field. Schemas accept what inputs produce (`""`) and transform to the API shape (`null`). Client rules mirror the backend (title ≤ 200, 2 MiB, extensions), but backend errors are still mapped to fields (`mapCreateError`): parse errors land on the file/textarea with the line number.

**34. How does error display work end to end?**
The interceptor normalises every failure into `ApiError` but shows nothing. Queries render inline `ErrorState` with Retry; mutations toast once in `MutationCache.onError` unless `meta.suppressErrorToast` is set (decision 15). A 4xx isn't retried; 5xx/network retried once.

**35. How do you handle theming and hydration?**
Tailwind v4 tokens as CSS variables for `:root` and `.dark`, exposed as `bg-page`, `text-secondary`… (decision 14). A tiny inline script in `layout.tsx` sets the saved theme before first paint, with `suppressHydrationWarning` on `<html>`. Anything from `localStorage` is applied after mount, via `safe-storage.ts` (try/catch), to avoid hydration mismatches (decision 58).

## E. Operations, quality, trade-offs

**36. What is your testing strategy?**
Backend: ~220 pytest tests with FastAPI `TestClient` and a fresh in-memory SQLite per test (`StaticPool`), `dependency_overrides[get_db]`, two seeded users for isolation tests; pure units for parser, generators, formatter, LLM client (mocked); a migration drift test; production-error and CORS tests. Frontend: Vitest for **pure** logic only (binary search, URL state, schemas, highlight splitting). Not covered: components/E2E (no jsdom/Playwright), real Groq calls, cross-browser player behaviour. That's a conscious time trade-off.

**37. How would you add real authentication?**
Replace the body of `core/deps.py::get_current_user` (verify a JWT/session cookie → user) and add login endpoints plus a `password_hash` or an external IdP (Clerk/Auth0). Every route already depends on `CurrentUser`, and every query is owner-scoped. Then: CORS with credentials is already on; add refresh/expiry handling to the axios interceptor (401 → login); remove the seeded-user assumption; and make `participants` per-owner (today it's a global table, which would leak people across tenants).

**38. How would you scale this beyond a demo?**
Postgres + connection pool and a persistent store for uploads; move LLM calls to a background queue (summaries can take 30 s and block a worker thread); cursor pagination; FTS (Postgres `tsvector` or the FTS5 plan) for search; real STT; per-user rate limits; caching of `GET /participants`; structured logs shipped to a collector (request ids already exist). Horizontal scale needs a shared DB (SQLite file is single-writer, single-instance).

**39. Why does data disappear on Render, and what did you do about it?**
SQLite lives on an ephemeral disk, discarded on redeploy/restart. `start.sh` re-migrates and the app re-seeds demo data when no meetings exist, so the app is never blank, but user uploads are lost. Options documented in `docs/deployment.md`: a paid persistent disk (single instance) or managed Postgres. I chose the simple option because the assignment is a demo, and documented the limitation openly.

**40. What would you do with more time, and what are the known limitations?**
*More time:* global search (FTS5, already specified in `docs/api.md`), tags CRUD UI/endpoints, real auth, background summary jobs, component/E2E tests, per-user participants, optimistic locking (`updated_at` / ETag) so two tabs can't overwrite each other, accessibility audit, a CI pipeline (none exists; checks run manually).
*Known limitations:* `/search` and navbar search are placeholders; tags have no write API; the summary label says `llm` even when generation fell back to the mock (decision 46); no real media for seeded meetings (simulated clock); in-memory chat; Postgres untested; the summary `generated_by` doesn't say "edited" (decision 53).

---

## Decisions to add to `docs/decisions.md`

These are real choices in the code that the log doesn't cover. Add them (this task only creates docs in `docs/learn/`, so they are proposed, not applied):

116. **Sync route handlers (`def`), not `async def`** — SQLAlchemy and the Groq SDK are blocking; FastAPI runs `def` routes in a threadpool so the event loop isn't blocked. `async` is used only for middleware, handlers and `lifespan`. Alt: async SQLAlchemy (partly covered by 13). **(new)**
117. **No confirmation before regenerating a summary** — regenerate is disabled while editing (`SummaryToolbar`) but otherwise replaces overview, bullets, keywords and chapters at once; decide whether that is intended. **(new, if intentional)**
118. **`include_action_items` is opt-in on regenerate, and create's `generate_summary` defaults to `false` in the API but `true` in the form** — API callers get no surprise side effects; UX default is "do the useful thing". **(new)**
119. **`passive_deletes` + DB cascade vs ORM cascade for `tags`** — `meeting_tags` rows are removed by the DB cascade; `Meeting.tags` has `passive_deletes=True` only. **(new, small)**
120. **WAL mode on every SQLite connection** — concurrent readers while a writer writes; set next to `foreign_keys=ON`. (Mentioned in `schema.md`, not in the log.) **(new)**
121. **`/health` (liveness) is not under `/api/v1`** — hosts/smoke tests consume it, clients don't (extends 103). **(new, small)**
122. **List endpoints for small bounded sets (`/participants`, per-meeting action items) return `{items}` without paging** — deviates from CLAUDE.md's `{items,total,page,limit}` convention because the sets are small by nature (≤ 100 participants; items per meeting). Document it next to the convention. **(new)**
123. **`cn` helper from the `cn` package instead of `clsx` + `tailwind-merge`** — see "Things to double-check". **(new, if intentional)**
124. **Segment text edits don't bump any `updated_at`** — see "Things to double-check". **(new, if intentional)**

---

## Things to double-check

Things I found while reading the code that I couldn't fully explain, or that look inconsistent. None were changed (docs-only task). Verify each before an interview.

1. **`transcript_segments` is mutable but has no `updated_at`.** `PATCH /transcript-segments/{id}` edits `text`/`speaker_label` (`transcripts/service.py::update_segment`), but the model only has `CreatedAtMixin`. CLAUDE.md §4: "mutable tables also have `updated_at`". Either add the column (new migration) or document the exception.
2. **Docs vs reality: `segments_fts` and `GET /search`.** `docs/schema.md` and `docs/api.md` describe FTS5 search; nothing implements it (`modules/search/` only has a `.gitkeep`; the navbar search is a placeholder). The decision log (25) and README admit this, but the two spec files read as if it exists.
3. **`docs/plan.md` is stale.** Deploy, README, and "dark mode toggle"/"Home dashboard" boxes are unchecked although the README links live URLs, Home and dark mode exist; it also says "6 seeded meetings" but only **4** JSON files exist (README says 4).
4. **`cn` dependency.** `shared/utils/cn.ts` re-exports `cn` from an npm package named `cn` (comment: "shadcn's own package"). The usual shadcn setup is `clsx` + `tailwind-merge`. Confirm this package is the one you intend (supply-chain hygiene; small package name, easy to typo-squat), and be ready to explain it.
5. **`shadcn` listed under `dependencies`.** It's a CLI/generator; it is normally a dev-time tool. Harmless but worth a one-line justification (`shadcn/tailwind.css` is also imported from `globals.css`, which may be the reason).
6. **500 responses and CORS.** Unhandled exceptions are turned into a 500 by Starlette's outermost `ServerErrorMiddleware`, which sits *outside* `CORSMiddleware`; in the browser such a response often shows up as a CORS error rather than your JSON body. `tests/test_production_errors.py` checks the body but not the CORS headers. Test it against a deployed backend before claiming the error flow works for 500s cross-origin.
7. **`generated_by` can lie.** `builder.current_generated_by()` returns `llm` whenever a key is set, even when `LLMSummaryGenerator` silently fell back to the mock (decision 46 acknowledges this). `GeneratedByBadge` shows the sparkle "AI generated" badge for both `mock` and `llm`, so a mock summary is labelled like an LLM one.
8. **Summary regeneration partially overwrites manual edits.** Regenerate replaces `overview`, `bullet_points`, `keywords` and all chapters in place, discarding manual edits (action items are protected by dedupe, summary text isn't). I found no confirmation dialog in `SummaryToolbar`/`SummaryPanel` (only a guard that disables Regenerate while editing); verify this is intended.
9. **`ix_meetings_title` is unlikely to be used.** The title search is `ILIKE '%q%'` (leading wildcard), which can't use a B-tree index. The index adds write cost for no read benefit. Keep only if you can justify it (e.g. `ORDER BY lower(title)` doesn't use it either).
10. **Seed file names are inconsistent**: `01_product_roadmap_sync.json` (underscore) vs `02-post-incident-review.json` (hyphen). Harmless (sorted by name) but visible.
11. **Stray untracked folder** `download-idVVPG1ke4-1791365712672/Fireflies-ai/` (empty directories) in the repo root. Not tracked by git (empty), but it looks like a leftover download; delete when convenient.
12. **`UTCDateTime` + `date` filters.** `date_from`/`date_to` are plain `date`s interpreted as **UTC** days; a user in IST filtering "today" can miss meetings near midnight local time. Documented (decision 42) but a likely interviewer probe.
13. **Duplicate-email edge in `find_or_create`.** Emails are lower-cased on lookup, but the unique index on `participants.email` is case-sensitive in SQLite, and `Participant.email` is only lower-cased when created through `find_or_create` (the seed inserts the email as written). Mixed-case seed emails could create a near-duplicate. Low risk, easy to check.
14. **No CI config.** There's no `.github/workflows`; the lint/test commands in CLAUDE.md are manual. The decision log mentions "fails CI" (decision 22); be careful not to claim CI exists.
15. **Ask history trust.** `AskRequest.history` is client-supplied and sent to the model as prior `assistant` turns, so a client can forge assistant messages (prompt-injection surface; the transcript-only grounding instruction is the only guard). Fine for a demo; mention as a limitation if asked about LLM security.
16. **Ownership isn't enforced on `participants` globally.** `GET /participants` is scoped to people in the owner's meetings, but `find_or_create` can attach another user's existing participant row (matched by email) to your meeting. Irrelevant with one user, relevant if real auth is added (see Q37).
