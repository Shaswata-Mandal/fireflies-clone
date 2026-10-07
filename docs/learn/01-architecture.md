# 01 — Architecture

## 1. The whole system on one page

```
 ┌────────────────────────────── BROWSER ───────────────────────────────┐
 │  React components ──▶ hooks.ts (TanStack Query) ──▶ api.ts           │
 │        ▲                    │ cache (QueryClient)        │           │
 │        │ Context: Theme, UI, Player(+TimeStore)          ▼           │
 │        │                                   apiClient (axios instance)│
 └────────┼───────────────────────────────────────────────┬────────────┘
          │ served by                                     │ HTTPS, JSON, snake_case
          ▼                                               │ base = NEXT_PUBLIC_API_URL (…/api/v1)
 ┌───────────────────┐                                    ▼
 │ Next.js on Vercel │      ┌──────────────────── FastAPI on Render ──────────────────────┐
 │ (static HTML/JS + │      │ uvicorn ▶ RequestLoggingMiddleware ▶ CORSMiddleware          │
 │  client-side data │      │   ▶ exception handlers ▶ router (core/health + 8 modules)   │
 │  fetching)        │      │                                                              │
 └───────────────────┘      │   router.py   parse + validate (Pydantic), call ONE service  │
                            │      │  Depends(get_db), Depends(get_current_user)           │
                            │      ▼                                                       │
                            │   service.py  business rules, transactions, AppException     │
                            │      │               └──▶ utils/ (parser, summary gen,       │
                            │      ▼                     llm_client ──▶ Groq API, optional)│
                            │   repository.py  SQL only (SQLAlchemy select/insert/delete)  │
                            │      ▼                                                       │
                            │   SQLAlchemy ORM / Session ──▶ SQLite file (fireflies.db)    │
                            └──────────────────────────────────────────────────────────────┘
```

Two separately deployed apps. The browser downloads the Next.js bundle from Vercel, then **the browser itself** calls the FastAPI service on Render (that is why CORS exists). Next.js never proxies API calls: every data-fetching component is a client component.

MERN mapping: Next.js ≈ the React app (plus routing and a build system); FastAPI ≈ Express; SQLAlchemy ≈ Mongoose; SQLite ≈ MongoDB (but it's a single file, not a server).

---

## 2. Backend layering, with one feature traced end to end

### The rule (CLAUDE.md §4)

`router → service → repository → DB`. Each layer has **one reason to change**:

| Layer | Question it answers | Real example | Must NOT |
|---|---|---|---|
| `router.py` | "What HTTP shape?" | `action_items/router.py::update_action_item` | query the DB, hold rules |
| `service.py` | "What are the business rules?" | `action_items/service.py::update_item` | import FastAPI, build SQL |
| `repository.py` | "How do I read/write this?" | `action_items/repository.py::get_owned` | decide anything |
| `schemas.py` | "What does the JSON look like?" | `ActionItemUpdate`, `ActionItemRead` | touch the DB |
| `models.py` | "What does the table look like?" | `ActionItem` | contain logic |

Cross-module calls go **service → service** (e.g. `action_items.service` calls `meetings.service.get_owned_or_404` and `participants.service.is_in_meeting`), never router → another module's repository.

### Trace: "tick the checkbox on an action item"

Frontend half:

| # | File → function | What happens |
|---|---|---|
| 1 | `modules/action-items/components/ActionItemRow.tsx` → checkbox `onChange` | calls `toggle.mutate({ id, isCompleted: !item.is_completed })` |
| 2 | `modules/action-items/hooks.ts` → `useToggleActionItem` → `onMutate` | `patchListOptimistically`: cancel in-flight refetch, snapshot the list, flip `is_completed` in the cache. **The UI updates now.** |
| 3 | same hook → `mutationFn` → `modules/action-items/api.ts::updateActionItem` | `apiClient.patch("/action-items/7", { is_completed: true })` |
| 4 | `shared/lib/api-client.ts` | axios instance, `baseURL = env.apiUrl`, 15 s timeout |

Backend half (in the order the code runs):

| # | File → function | What happens |
|---|---|---|
| 5 | `core/request_logging.py::RequestLoggingMiddleware.__call__` | reads/creates `X-Request-ID`, starts a timer |
| 6 | Starlette `CORSMiddleware` (added in `main.py::create_app`) | checks `Origin` against `settings.CORS_ORIGINS` / regex |
| 7 | FastAPI route matching → `action_items/router.py::update_action_item` | before the function body runs, FastAPI resolves its parameters: |
| 7a | → `core/database.py::get_db` (via `DbSession`) | opens one `Session` for this request (`yield`) |
| 7b | → `core/deps.py::get_current_user` → `users/service.py::get_user` → `users/repository.py::get_by_id` | the fake auth: loads user id 1, or `USER_NOT_FOUND` if the DB was never seeded |
| 7c | → body parsed into `ActionItemUpdate` (`action_items/schemas.py`) | Pydantic validation; `_reject_null_for_required_fields` runs. Invalid → `RequestValidationError` → 422 (see §5) |
| 8 | `router.update_action_item` | one line: `return service.update_item(db, user, item_id, body)` |
| 9 | `action_items/service.py::update_item` | the business logic: |
| 9a | → `_get_owned_or_404` → `repository.get_owned` | `SELECT … FROM action_items JOIN meetings … WHERE id=? AND meetings.owner_id=?` with `selectinload` for assignee + source segment. `None` → `NotFoundError("ACTION_ITEM_NOT_FOUND")` |
| 9b | → `data.model_fields_set` | distinguishes "field not sent" from "sent as null" |
| 9c | → `_apply_completion(item, True)` | only if the flag actually flips: sets `is_completed` and `completed_at = utcnow()` |
| 9d | → `item.updated_at = utcnow()`; `db.commit()` | the transaction commits here (the service owns it) |
| 9e | → `db.expire(item)`; `_get_owned_or_404` again | re-read so the response is fresh |
| 9f | → `to_read(item)` → `_fields(item)` | build `ActionItemRead` DTO (nested `AssigneeBrief`, `source_start_ms`) |
| 10 | FastAPI `response_model=ActionItemRead` | serialises to JSON, status 200 |
| 11 | `get_db` `finally: db.close()` | session closed even on errors |
| 12 | `RequestLoggingMiddleware` `finally` | logs `PATCH /api/v1/action-items/7 -> 200 in 4.1ms`, adds `X-Request-ID` header |

Back in the browser:

| # | File → function | What happens |
|---|---|---|
| 13 | axios resolves; `onSettled` in `useToggleActionItem` | `refreshAfterChange`: invalidate `actionItems.byMeeting(id)` and `meetings.lists()` (the library card shows "open items") → both refetch |
| — | on failure | `onError` → `rollback()` restores the snapshot, `toastItemError()` shows the message |

> Interview one-liner: *"The router knows HTTP, the service knows the rules, the repository knows SQL, and only the service commits."*

### Transaction rule (important, graded)

Repositories **never commit**; they `flush()` so IDs exist. Public service functions call `db.commit()` once and `db.rollback()` on exceptions (see `meetings/service.py::_create`). A failed create leaves nothing behind.

### Exceptions to the layering (deliberate and documented)

- `seed/seed.py` talks to the session directly (it's a script, decision 35).
- `summaries/builder.py` is a DB-free mapper used by both `meetings` and `summaries` to avoid an import cycle (decision 52).
- `ask/` has no repository; it reads segments through `transcripts.service` (decision 112).
- `users/router.py::get_me` has no service call: the `CurrentUser` dependency already loaded the user.

---

## 3. Frontend layering

```
src/app/…/page.tsx      routing only: pick a module component, wrap in <Suspense> where needed
      │
src/modules/<m>/components/*.tsx     UI; call hooks, never axios
      │
src/modules/<m>/hooks.ts             TanStack Query: useQuery / useMutation, cache keys, invalidation
      │
src/modules/<m>/api.ts               raw typed HTTP calls using apiClient, no React
      │
src/shared/lib/api-client.ts         the one axios instance (+ response interceptor → ApiError)
```

| Piece | Real file | Notes |
|---|---|---|
| **Routes** | `app/meetings/page.tsx`, `app/meetings/[id]/page.tsx` | App Router: folder name = URL. `[id]` = dynamic segment. Pages are thin; `[id]/page.tsx` parses the id with `parseMeetingIdParam` and renders `<MeetingDetailView key={meetingId}>` (the `key` forces a full remount, including the player, when you navigate meeting → meeting). |
| **Layout** | `app/layout.tsx` | Server component. Loads the font, injects a tiny inline script to apply the saved theme before first paint, renders `<Providers><AppShell>{children}</AppShell></Providers>`. Persisting across navigations: the sidebar/navbar never remount. |
| **Providers** | `shared/components/Providers.tsx` | `QueryClientProvider` → `ThemeProvider` → `UIProvider` → `TooltipProvider` → `CreateMeetingProvider`, plus react-hot-toast's `<Toaster>`. `useState(makeQueryClient)` gives one client per browser session. |
| **api.ts** | `modules/meetings/api.ts` | Plain `async` functions: `listMeetings(query, signal)`, `getMeeting`, `uploadMeeting` (FormData), `exportMeeting` (blob). They `return data`. |
| **hooks.ts** | `modules/meetings/hooks.ts` | `useMeetings` (with `keepPreviousData`), `useMeeting`, `useCreateMeeting`, `useUpdateMeeting`, `useDeleteMeeting` (optimistic) … |
| **Query keys** | `shared/constants/query-keys.ts` | Hierarchical arrays: `["meetings","list",{params}]`, `["meetings","detail",12]`, `["meetings","detail",12,"transcript"]`, `["action-items","meeting",12]`. Invalidating a prefix invalidates everything under it. |
| **Types** | `modules/<m>/types.ts` | Hand-written mirrors of the backend schemas in snake_case; no conversion layer. |
| **Forms** | `modules/meetings/schemas.ts` + react-hook-form | zod schema = client validation; mirrors backend limits. |
| **PlayerProvider** | `modules/player/components/PlayerProvider.tsx` | Mounted *inside* `MeetingDetailView`, so it lives and dies with one meeting page. See §4 and `02-workflows.md` (b). |

### Server vs client components

Every file under `src/app/` (the layout and all 9 pages) is a *server* component: none has `"use client"`. They only compose module components, and `[id]/page.tsx` is `async` so it can `await params`. Every module component that uses hooks, state, or events has `"use client"` at the top (the "client boundary"; its children are client too). **All data is fetched in the browser** (TanStack Query), not in server components. That is a deliberate simplification: one data path, one cache, and the API is a separate service anyway.

---

## 4. Where state lives

| Kind of state | Where | Real example | Why |
|---|---|---|---|
| **Server state** (data owned by the backend) | TanStack Query cache | `useMeetings`, `useActionItems`, `useTranscript` | caching, dedupe, loading/error flags, invalidation, optimistic updates for free (decision 9) |
| **UI chrome state** | React Context | `UIContext` (sidebar collapsed, mobile drawer, AskFred panel open, right-panel tab), `ThemeContext` | small, global, not from the server |
| **Create-modal open/close** | its own Context | `CreateMeetingContext` | kept out of `UIContext` (decision 95) |
| **View state of the library** | the **URL** | `/meetings?q=roadmap&participant_id=3&sort=title&page=2` | reload, Back, shared links restore the exact view (decisions 62-63). Parsed by `modules/meetings/url-state.ts`, wired by `use-meetings-url-state.ts` |
| **Detail-page tab** | URL `?tab=` | `use-tab-param` | same reason |
| **Deep-link time** | URL `?t=<ms>` | `player/use-deep-link-seek.ts` | link to a moment |
| **Form state** | react-hook-form (local) | `CreateMeetingForm` | ephemeral |
| **Chat messages** | `useState` in `use-ask-chat.ts` | per panel | not server state; a refresh starts a new chat |
| **Player clock (60 fps)** | **a plain object outside React** (`TimeStore`) + `useSyncExternalStore` | `player/time-store.ts` | see below |
| **Remembered prefs** | `localStorage` via `safe-storage.ts` | sidebar collapsed, theme | wrapped in try/catch |

### The player clock (the cleverest part of the frontend)

Problem: a clock that updates ~60 times per second. If that were `useState`, the entire transcript (hundreds of lines) would re-render 60×/s.

Solution (decision 74):

1. `time-store.ts::createTimeStore` is a tiny store: `getTimeMs`, `setTimeMs`, `subscribe`. Plain JS closure, **not React state**.
2. A clock writes into it each animation frame:
   - `use-simulated-clock.ts` (no media file): `requestAnimationFrame` loop that adds *real elapsed time × playback rate*.
   - `use-media-element-clock.ts` (real `<audio>/<video>`): an rAF loop copies `element.currentTime` into the store (the `timeupdate` event only fires ~4×/s, too coarse).
3. Readers use `useSyncExternalStore(store.subscribe, getSnapshot)` with a **derived snapshot**:
   - `usePlayerTimeMs()` → time rounded down to 100 ms → ≤ 10 renders/s (time label, seek bar).
   - `useActiveSegmentIndex(segments)` → the *index* of the active line → React compares numbers and re-renders only when the active line changes (every few seconds).
4. Two contexts: `PlayerContext` (controls, `isPlaying`, rate: change rarely) and `PlayerTimeContext` (the store object, whose identity never changes). So time never re-renders control consumers.
5. `TranscriptLine` is `React.memo` with primitive props, so only the old and new active lines re-render.

CLAUDE.md §5 says "PlayerProvider owns `currentTimeMs`". The implementation intentionally goes one step further (store instead of state). It's a documented deviation: be ready to say why.

---

## 5. Error handling flow

```
service raises NotFoundError("MEETING_NOT_FOUND", "Meeting 12 not found")      (core/exceptions.py)
        │
        ▼  FastAPI looks up the handler for the exception class
_app_exception_handler  ──▶  JSON { "error": { "code", "message", "details" } }  + HTTP status
        │
        ▼  (browser)
axios rejects ──▶ response interceptor in api-client.ts ──▶ toApiError(error)    (api-error.ts)
        │          normalises EVERYTHING into one class:
        │            ApiError { status, code, message, details }
        │            - has response + our envelope → code/message from the body
        │            - has response, no envelope   → code "HTTP_502" etc.
        │            - no response + timeout       → code "TIMEOUT"
        │            - no response otherwise       → code "NETWORK_ERROR"
        ▼
 ┌─────────────── queries ───────────────┐   ┌──────────────── mutations ────────────────┐
 │ no toast. The component reads         │   │ MutationCache.onError (query-client.ts)   │
 │ `isError`/`error` and renders an      │   │ toasts `error.message` once, unless       │
 │ inline <ErrorState> with Retry        │   │ `meta.suppressErrorToast` is set          │
 └───────────────────────────────────────┘   └───────────────────────────────────────────┘
```

Backend handlers registered in `core/exceptions.py::register_exception_handlers`:

| Exception | Handler | Resulting `code` / status |
|---|---|---|
| `AppException` (and subclasses) | `_app_exception_handler` | the exception's own `code` and `status_code` |
| `RequestValidationError` (Pydantic failed on a request) | `_request_validation_handler` | `VALIDATION_ERROR`, 422, `details` = list of `{loc, msg, type}` |
| `StarletteHTTPException` (unknown route, wrong method) | `_http_exception_handler` | `NOT_FOUND` or `HTTP_<status>` |
| anything else | `_unhandled_exception_handler` | `INTERNAL_ERROR`, 500; logs the stack; `details` hidden when `ENV=production` |

Details worth knowing:

- **Retries** (`query-client.ts::shouldRetry`): queries retry once for network/5xx errors, never for 4xx (a wrong request can't succeed on retry). Mutations never retry.
- **Opt-out of the global toast**: the action-item hooks, the ask chat, etc. set `meta: { suppressErrorToast: true }` and handle the message themselves (for example a 404 on an item says "no longer exists").
- **Cancelled requests** (TanStack aborts a stale query) are passed through the interceptor untouched (`axios.isCancel`).
- **Forms** additionally map backend errors to fields (`meetings/form-errors.ts::mapCreateError`).

---

## 6. Deployment

```
   GitHub repo ──push──▶ Render (Blueprint: render.yaml)           Vercel (dashboard config)
                           │ build: pip install -r requirements.txt   │ Root Directory: frontend
                           │ start: sh scripts/start.sh               │ build: next build
                           │                                          │ env: NEXT_PUBLIC_API_URL=
                           │   1. cd backend                          │      https://<api>.onrender.com/api/v1
                           │   2. alembic upgrade head   (every boot) │      (inlined at BUILD time)
                           │   3. exec uvicorn app.main:app           │
                           │        --host 0.0.0.0 --port $PORT       ▼
                           │   4. lifespan startup:             https://<app>.vercel.app
                           │      if SEED_ON_STARTUP and no meetings         │
                           │         → seed_if_empty()                       │ browser calls the API directly
                           ▼                                                 ▼
                    https://<api>.onrender.com  ◀──────────── CORS check ────┘
                       health check: GET /health
```

Env vars (backend, from `core/config.py` / `render.yaml`):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | **yes** | `sqlite:///./fireflies.db` (relative file). Absolute path (4 slashes) for a persistent disk. |
| `CORS_ORIGINS` | **yes** | **JSON list**: `["https://<app>.vercel.app"]`. Exact origin, no trailing slash. |
| `CORS_ORIGIN_REGEX` | no | e.g. Vercel preview URLs whose host changes per deploy. |
| `ENV` | no | `production` hides 500 details. |
| `SEED_ON_STARTUP` | no (default true) | seed demo data if the DB has no meetings. |
| `GROQ_API_KEY`, `LLM_MODEL` | no | enable real AI; otherwise mock summaries and ask → 503. |
| `LOG_LEVEL` | no | default `INFO`. |

Frontend: only `NEXT_PUBLIC_API_URL`. `next.config.ts` imports `shared/lib/env.ts`, which **throws at build time** if it is missing in production (decision 109). Because `NEXT_PUBLIC_*` values are baked into the JS bundle, changing it needs a **redeploy**, not a restart.

### CORS in one paragraph

The browser blocks JS on `https://app.vercel.app` from reading responses from `https://api.onrender.com` unless the API says so. `CORSMiddleware` in `main.py` answers the preflight (`OPTIONS`) and adds `Access-Control-Allow-Origin` when the `Origin` is in `CORS_ORIGINS` (or matches the regex). It also `expose_headers=["Content-Disposition"]` so the export filename is readable by JS. Express equivalent: the `cors` package.

### Why SQLite "resets" on free hosts

SQLite is a **single file** on the service's local disk. Free web services have an **ephemeral filesystem**: on each deploy/restart/new instance the disk is thrown away, so `fireflies.db` disappears, and with it every meeting a user uploaded. On boot, `start.sh` re-creates the schema (`alembic upgrade head`) and the app's `lifespan` re-seeds the demo meetings (`SEED_ON_STARTUP=true` and zero meetings), so the app is never blank, but user data is lost. Fixes: attach a persistent disk and point `DATABASE_URL` at it (commented block in `render.yaml`, limits: paid plans, single instance), or move to a hosted Postgres (change `DATABASE_URL` + driver; see 05-interview-qa.md).

Related gotchas: cold starts (first request after idle is slow, `scripts/smoke.py` uses a 60 s timeout), and two instances can't share one SQLite file.
