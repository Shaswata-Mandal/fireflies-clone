# 04 — Concepts for a MERN developer

Each section: the MERN idea → the equivalent here → **where to look in this repo**.

## Master translation table

| MERN thing | This project | Real example |
|---|---|---|
| Express `app` + `app.use()` | `FastAPI()` app factory + `add_middleware` / `include_router` | `backend/app/main.py::create_app` |
| `express.Router()` | `APIRouter` | `modules/action_items/router.py` |
| Route handler / controller | router function (thin) | `router.update_action_item` |
| Service layer | `service.py` (business rules, `AppException`) | `action_items/service.py::update_item` |
| Mongoose query code / DAO | `repository.py` (SQLAlchemy `select`) | `action_items/repository.py::get_owned` |
| Mongoose model/schema | SQLAlchemy model (`Mapped[]`) | `modules/meetings/models.py::Meeting` |
| Joi / zod / express-validator | Pydantic `BaseModel` | `meetings/schemas.py::MeetingCreate` |
| `req.body` / `req.params` / `req.query` | typed function parameters | `meetings/router.py::list_meetings` |
| `res.json()` shape / DTO | `response_model=` | `@router.get("", response_model=MeetingList)` |
| Middleware `(req,res,next)` | ASGI middleware **and** `Depends()` dependencies | `core/request_logging.py`, `core/deps.py` |
| `req.user` set by auth middleware | `CurrentUser` dependency | `core/deps.py::get_current_user` |
| Error-handling middleware `(err,req,res,next)` | `add_exception_handler` | `core/exceptions.py::register_exception_handlers` |
| `dotenv` + `process.env.X` | `pydantic-settings` `Settings` | `core/config.py` |
| `cors` package | `CORSMiddleware` | `main.py` |
| Mongoose `populate()` | `selectinload()` / `joinedload()` | `meetings/repository.py::list_filtered` |
| Mongoose `pre('remove')` / cascade code | DB `ON DELETE CASCADE` + `cascade=` relationships | `Meeting.segments` |
| migrate-mongo (rare) | Alembic (essential) | `backend/alembic/` |
| `nodemon` | `uvicorn --reload` | `06-commands-cheatsheet.md` |
| Postman / Swagger add-on | built-in docs at `/docs` | http://localhost:8000/docs |
| Jest + supertest | pytest + `TestClient` | `backend/tests/` |
| React Router | Next.js App Router (file-based) | `frontend/src/app/` |
| `useEffect` + `fetch` + `useState` / Redux Toolkit | TanStack Query | `modules/meetings/hooks.ts` |
| Redux store for UI | Context API (small contexts) | `shared/context/UIContext.tsx` |
| Formik/Yup | react-hook-form + zod | `modules/meetings/schemas.ts` |
| CRA/Vite env `REACT_APP_*` | `NEXT_PUBLIC_*` | `shared/lib/env.ts` |
| `node_modules` | `.venv` | `backend/.venv` |

---

## Express route/controller/service/model ↔ FastAPI router/service/repository/model

In Express you often put DB calls straight in the controller. Here the strict rule is `router → service → repository → DB`, and **only the service commits**.

```python
# router.py: HTTP only
@router.patch("/action-items/{item_id}", response_model=ActionItemRead)
def update_action_item(item_id: int, body: ActionItemUpdate, db: DbSession, user: CurrentUser):
    return service.update_item(db, user, item_id, body)
```

`item_id: int` is a path parameter (auto-parsed, 422 if not an int); `body: ActionItemUpdate` is the JSON body (validated by Pydantic); `db` and `user` are injected. Compare with Express: `req.params.id`, `req.body`, `req.user`, a global `db`, all untyped and unchecked.

The ORM difference: Mongoose documents are plain objects with `.save()`. A SQLAlchemy **Session** tracks objects ("unit of work"): change an attribute on a loaded object, call `db.commit()`, and it emits the `UPDATE`. See `update_item`: `item.assignee_id = …` then `db.commit()`. `db.flush()` sends pending SQL *without* ending the transaction (used in repositories so IDs exist).

## Joi/zod ↔ Pydantic

Pydantic models are classes with typed fields; FastAPI validates automatically and answers **422** on failure. Real examples:

- Constraints: `Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]` (`meetings/schemas.py`).
- Cross-field rule: `@model_validator(mode="after")` (`ActionItemUpdate._reject_null_for_required_fields`).
- "Was this field sent?": `data.model_fields_set` (PATCH semantics: absent ≠ null). In Mongoose you'd check `'x' in req.body`.
- `ConfigDict(from_attributes=True)` = "you may build me from an ORM object" (`ParticipantBrief.model_validate(link.participant)`), like `.toJSON()` but typed.
- Response models also *filter*: fields not in `response_model` never leave the server.

Frontend has the mirror image: **zod** schemas (`modules/meetings/schemas.ts`) validate forms in the browser, with the same limits as the backend (kept in sync by hand in `constants.ts`).

## Middleware ↔ dependencies (`Depends`)

Two different mechanisms:

1. **ASGI middleware** wraps every request (`add_middleware`): `RequestLoggingMiddleware` (request id + timing), `CORSMiddleware`. Same idea as `app.use(fn)`.
2. **Dependencies** (`Depends`) are *per-route* injected values, resolved before your handler, and can `yield` for cleanup:

```python
def get_db() -> Iterator[Session]:     # core/database.py
    db = SessionLocal()
    try:
        yield db                       # handler runs here
    finally:
        db.close()                     # always runs, even on exceptions

DbSession = Annotated[Session, Depends(get_db)]       # core/deps.py
def get_current_user(db: DbSession) -> User: ...      # dependencies can depend on dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
```

Auth is a one-function swap: replace `get_current_user` and every route changes behaviour. In tests, `app.dependency_overrides[get_db] = override_get_db` (`tests/conftest.py::api`) swaps the DB with no mocking library.

## React Router ↔ Next.js App Router

| React Router | Next.js (this repo) |
|---|---|
| `<Route path="/meetings/:id" element={…}>` | file `src/app/meetings/[id]/page.tsx` |
| `useParams()` | `params` prop (`await params` in a server page) |
| `useSearchParams()` | `useSearchParams` from `next/navigation` (client components; needs `<Suspense>`) |
| `useNavigate()` | `useRouter()` → `router.push` / `router.replace` |
| `<Link>` | `next/link` |
| a layout via nested `<Outlet>` | `layout.tsx` wraps all pages and **doesn't remount** on navigation |

Folder name = URL. `page.tsx` = the page, `layout.tsx` = shell. Real: `app/layout.tsx` renders `<Providers><AppShell>{children}</AppShell></Providers>`.
Next 16 gives global helper types `LayoutProps<"/">` and `PageProps<"/meetings/[id]">` (used in those files).

## Redux / `useEffect+fetch` ↔ TanStack Query

```ts
// Hand-rolled (what you'd write in CRA): state + effect + loading + error + refetch + cache… per component

// Here:
const { data, isPending, isError, error, refetch } = useQuery({
  queryKey: queryKeys.meetings.list(query),
  queryFn: ({ signal }) => listMeetings(query, signal),
});
```

You get caching by key, dedupe (two components calling `useTranscript(id)` = one request), retries, abort on unmount (`signal`), `staleTime`, and **invalidation** (`queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() })` marks every list stale and refetches the active ones). Writes use `useMutation` with `onMutate` / `onError` / `onSettled` for optimistic updates (`action-items/hooks.ts`).

Mental model: **the cache is the Redux store for server data**; you never copy API data into `useState`. UI state (sidebar, theme) stays in Context.

## Server vs client components and `"use client"`

- In the App Router every component is a **server component by default**: rendered on the server, ships no JS, can't use hooks, state or browser APIs.
- Add `"use client"` at the top of a file to make it (and everything it imports) a **client component** (normal React; hydrated in the browser).
- In this repo, everything in `src/app/` is a server component and only composes things; every interactive module component has `"use client"` (119 files do). Data fetching is entirely client-side through TanStack Query.
- Consequences you'll meet: `localStorage` / `window` only after mount (see `UIContext`'s `useEffect`), `suppressHydrationWarning` on `<html>` (the theme script changes the class before hydration), and `useSearchParams` requiring `<Suspense>`.
- The rule from CLAUDE.md: `"use client"` only where needed. `SpeakerBlock.tsx` has none because it is only imported from client components.

## async/await in FastAPI

- Handlers can be `async def` or plain `def`. **All route handlers here are plain `def`.** FastAPI runs `def` handlers in a **threadpool**, so blocking calls (SQLAlchemy sync, the Groq SDK) don't freeze the event loop.
- `async def` is used where the code awaits ASGI things: middleware (`RequestLoggingMiddleware.__call__`), exception handlers, and `lifespan`.
- Consequence: a DB connection may be used from a different thread than the one that opened it → `check_same_thread=False` in `database.py`. It's safe because each request has its **own** session (decision 13).
- Don't put blocking code in an `async def` handler; it blocks everyone. Node's single thread works the same way, so the instinct transfers.
- No `await` in service/repository code: SQLAlchemy is used in **sync** style (decision 13).

## pytest vs Jest

| Jest | pytest | Real example |
|---|---|---|
| `describe/it` | plain `def test_…()` functions with `assert` | `tests/test_action_items.py` |
| `beforeEach` | **fixtures**: functions with `@pytest.fixture`, injected by parameter name | `conftest.py::engine`, `db_session`, `api`, `make_meeting` |
| `jest.mock` | `monkeypatch.setattr` / `dependency_overrides` | `test_migrations.py` patches `settings.DATABASE_URL`; `conftest.api` overrides `get_db` |
| supertest | `TestClient(app)` | `api.post("/api/v1/…")` |
| `mongodb-memory-server` | in-memory SQLite (`sqlite://` + `StaticPool`) | `conftest.engine`: a fresh DB per test |

Notes: `conftest.py` sets env vars **before** importing `app` (settings are read once at import). The `api` fixture seeds users 1 and 2 to test ownership isolation, and uses `raise_server_exceptions=False` so a crash returns the 500 a client would see. ~220 test functions cover endpoints, parser, generators, migrations drift, CORS, logging, seeding.
Frontend tests (`npm run test`, Vitest, Node environment) cover **pure functions only**: binary search, URL state, schemas. No component tests (decision 73).

## Env handling

| | Node | Here |
|---|---|---|
| Read | `process.env.X` anywhere | **only** in `core/config.py` (`Settings`); everywhere else `from app.core.config import settings` |
| Typing/validation | none, strings | typed fields, `list[str]` from a JSON string, `Literal` for `ENV`, required fields crash at import |
| Files | `.env` via dotenv | `.env` via `SettingsConfigDict(env_file=".env")`; real env vars win over the file |
| Frontend | `REACT_APP_*` | `NEXT_PUBLIC_API_URL`, read only in `shared/lib/env.ts`, **inlined at build time** |

Secrets: `GROQ_API_KEY` is only ever set in the host dashboard / local `.env` (git-ignored); it is never logged.

## Type hints (Python) vs TypeScript

- TS types vanish at runtime. **Python type hints are real objects at runtime**, and this stack uses them: FastAPI reads parameter hints to parse/validate input, Pydantic builds validators from field hints, SQLAlchemy 2.0 builds columns from `Mapped[int | None]` (`| None` = nullable).
- Static checking is separate (mypy/pyright; not run in this repo: Ruff only lints). So hints on non-FastAPI code are documentation plus editor help.
- `X | None` = `X?`; `list[str]` = `string[]`; `Annotated[T, meta]` attaches metadata (`Depends`, `Query(ge=1)`, `StringConstraints`).
- `from __future__ import annotations` + `if TYPE_CHECKING:` imports in models avoid circular imports between modules.

## Python venv vs node_modules

| | Node | Python |
|---|---|---|
| Install location | `./node_modules` (automatic) | `.venv/` (you create and **activate** it) |
| Manifest | `package.json` + lockfile | `requirements.txt` (no lockfile; versions mostly `>=`, only `groq==1.7.0` is pinned) |
| Run a tool | `npx eslint` / `npm run x` | `python -m pytest`, `ruff`, `alembic` (must be the venv's) |
| Dev vs prod deps | `devDependencies` | separate `requirements-dev.txt` that does `-r requirements.txt` |

Windows: `.venv\Scripts\activate` (PowerShell: `.\.venv\Scripts\Activate.ps1`) or call `.venv\Scripts\python.exe -m pytest` directly. If a command "isn't found" or imports fail, you're almost certainly outside the venv.
