# CLAUDE.md — Fireflies.ai Clone

This file is the source of truth for how code is written in this repo. Read it before every task.
Also read `docs/schema.md`, `docs/api.md`, and `docs/plan.md`. UI reference screenshots live in `docs/reference/`.

## 1. Project

A functional clone of the Fireflies.ai meeting-assistant web app (SDE Fullstack assignment).
Users browse a meetings library, open a meeting to see an interactive transcript synced with a media
player, read AI summaries / action items / chapters, search, and do CRUD on meetings and action items.

**Out of scope (show "Coming Soon" placeholders only):** live meeting bot, real speech-to-text,
integrations (Zoom/Meet/Calendar/CRM), team sharing, real authentication, billing.

**Evaluation priorities:** working features > visual similarity to Fireflies > DB schema design >
API design > code quality/modularity > ability to explain every line. Prefer simple, explainable code
over clever code.

## 2. Tech stack (do not add new major dependencies without asking)

| Layer | Choice |
|---|---|
| Frontend | Next.js (latest stable, App Router), TypeScript `strict`, Tailwind CSS v4 |
| Frontend data | TanStack Query (server state), React Context (UI state: theme, sidebar, player) |
| Frontend forms | react-hook-form + zod |
| Frontend UI | lucide-react icons, react-hot-toast, shadcn/ui primitives (Dialog, DropdownMenu, Popover) |
| HTTP client | axios instance in `src/shared/lib/api-client.ts` |
| Backend | Python 3.11+, FastAPI, Pydantic v2, pydantic-settings |
| ORM / migrations | SQLAlchemy 2.0 (typed `Mapped[]` style), Alembic |
| Database | SQLite (`PRAGMA foreign_keys=ON` on every connection) |
| LLM (optional) | Anthropic API if `LLM_API_KEY` is set; otherwise deterministic mock generator |
| Tests | pytest + FastAPI TestClient (backend) |
| Lint/format | Ruff + Black (Python), ESLint + Prettier (TS) |
| Deploy | Backend → Render/Railway, Frontend → Vercel |

**Not used (by design):** Clerk/any auth provider, payments, PostgreSQL/MongoDB, Redux.

## 3. Repository layout

```
fireflies-clone/
├── CLAUDE.md
├── README.md
├── docs/            # schema.md, api.md, plan.md, decisions.md, reference/ (screenshots)
├── backend/
│   ├── app/
│   │   ├── main.py                 # app factory: CORS, routers, exception handlers, startup seed
│   │   ├── core/
│   │   │   ├── config.py           # Settings (pydantic-settings), single `settings` instance
│   │   │   ├── database.py         # engine, SessionLocal, Base, get_db() dependency
│   │   │   ├── exceptions.py       # AppException hierarchy + handlers
│   │   │   ├── deps.py             # get_current_user() → seeded default user
│   │   │   └── logging.py
│   │   ├── modules/
│   │   │   └── <module>/           # meetings, participants, transcripts, summaries, action_items, search
│   │   │       ├── models.py       # SQLAlchemy models
│   │   │       ├── schemas.py      # Pydantic request/response models
│   │   │       ├── repository.py   # DB queries ONLY
│   │   │       ├── service.py      # business logic ONLY
│   │   │       └── router.py       # HTTP layer ONLY
│   │   ├── utils/
│   │   │   ├── transcript_parser.py  # .txt / .vtt / .json → list[ParsedSegment]
│   │   │   └── summary_generator.py  # MockSummaryGenerator + LLMSummaryGenerator (same interface)
│   │   └── seed/
│   │       ├── seed.py             # idempotent: only seeds if DB empty
│   │       └── data/*.json         # seeded meetings
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── app/                    # ROUTES ONLY — thin pages that compose module components
        │   ├── layout.tsx          # Sidebar + Navbar + Providers
        │   ├── page.tsx            # redirect → /meetings (or Home dashboard)
        │   ├── meetings/page.tsx
        │   ├── meetings/[id]/page.tsx
        │   ├── uploads/page.tsx
        │   ├── integrations/page.tsx   # Coming Soon
        │   └── settings/page.tsx       # placeholders
        ├── modules/
        │   └── <module>/           # meetings, transcript, player, summary, action-items, search, settings
        │       ├── api.ts          # raw HTTP calls, typed, no React
        │       ├── hooks.ts        # TanStack Query hooks (useMeetings, useUpdateMeeting…)
        │       ├── types.ts
        │       └── components/
        ├── shared/
        │   ├── components/         # ui primitives, Sidebar, Navbar, Modal, EmptyState, Skeleton
        │   ├── context/            # ThemeContext, UIContext
        │   ├── hooks/              # useDebounce, useLockBodyScroll
        │   ├── lib/                # api-client.ts, query-client.ts, env.ts
        │   ├── constants/          # routes.ts, query-keys.ts
        │   └── utils/              # format-time.ts, cn.ts
        └── styles/globals.css      # theme tokens (Fireflies purple), light + dark
```

## 4. Backend rules

### Layering (strict — this is graded)
`router → service → repository → DB`

- **router.py**: parse request (Pydantic does validation), call ONE service function, return a response
  model. No queries, no business logic, no try/except for business errors.
- **service.py**: business rules, orchestration across repositories, raises `AppException` subclasses.
  Takes `db: Session` and plain arguments; returns ORM objects or DTOs. No FastAPI imports
  (no `Request`, `HTTPException`).
- **repository.py**: SQLAlchemy queries only. No business decisions. Functions are small and named for
  intent: `get_by_id`, `list_filtered`, `create`, `delete`.
- **schemas.py**: `XCreate`, `XUpdate` (all fields optional, used with PATCH), `XRead`, `XListItem`.
  Use `model_config = ConfigDict(from_attributes=True)`.
- Cross-module calls go service → service, never router → another module's repository.

### Errors
- Define in `core/exceptions.py`: `AppException(code, message, status_code)`, plus `NotFoundError`,
  `ValidationError`, `ConflictError`, `UnsupportedFileError`.
- One global handler returns:
  `{"error": {"code": "MEETING_NOT_FOUND", "message": "Meeting 12 not found", "details": null}}`
- Also register a handler for `RequestValidationError` that returns the same shape (code `VALIDATION_ERROR`).
- Never leak stack traces in production (`settings.ENV == "production"`).

### Database
- SQLAlchemy 2.0 typed models (`Mapped[int] = mapped_column(...)`).
- Every table has `id` (int PK), `created_at`; mutable tables also have `updated_at`.
- Times inside a meeting are **integer milliseconds** (`start_ms`, `end_ms`, `duration_ms`).
- Datetimes stored in UTC; frontend formats to local.
- Foreign keys use `ondelete="CASCADE"` where the child cannot exist without the parent; relationships use
  `cascade="all, delete-orphan"`.
- Enable `PRAGMA foreign_keys=ON` via an engine `connect` event listener.
- Schema changes go through Alembic migrations. Never edit an applied migration.
- Avoid N+1: use `selectinload` for participants/summary when listing meetings.

### Config
- All env vars read in `core/config.py` via `Settings(BaseSettings)`. No `os.getenv` elsewhere.
- Required: `DATABASE_URL`, `CORS_ORIGINS`. Optional: `LLM_API_KEY`, `LLM_MODEL`, `ENV`.

### Auth
- No real auth. `core/deps.py::get_current_user` returns the seeded default user (id=1).
  All routes that need an owner depend on it, so real auth is a one-function swap.

### API conventions
- Prefix `/api/v1`. Plural nouns. `GET` list/read, `POST` create (201), `PATCH` partial update (200),
  `DELETE` (204, no body).
- List endpoints return `{"items": [...], "total": n, "page": p, "limit": l}`.
- Query params snake_case; JSON bodies snake_case. Frontend types mirror snake_case (no conversion layer).
- Follow `docs/api.md` exactly. Do not add endpoints without updating that file.

## 5. Frontend rules

- **app/ is routing only.** Pages fetch via module hooks and compose module components. No `fetch`/axios
  in components; components call hooks, hooks call `api.ts`.
- **Server state = TanStack Query.** Query keys live in `shared/constants/query-keys.ts`.
  Mutations invalidate the right keys and show a toast on success/error. Use optimistic updates for
  toggling action-item completion.
- **UI state = Context** (theme, sidebar open, player). Keep contexts small and split by concern.
- **Player sync:** a single `PlayerProvider` owns `currentTimeMs`, `isPlaying`, `durationMs`,
  `seek(ms)`, `play()`, `pause()`. Transcript reads `currentTimeMs` to highlight the active segment
  (binary search on `start_ms`) and auto-scrolls it into view unless the user scrolled manually in the
  last 3 seconds. Clicking a segment calls `seek(segment.start_ms)`. If `media_url` is null, the
  player is a simulated clock driven by `requestAnimationFrame` with a working seek bar.
- **Transcript search:** case-insensitive, highlights all matches with `<mark>`, shows "n of m",
  up/down/Enter navigation, scrolls current match into view. Debounce input 200ms.
- **Every data view has loading (skeleton), empty, and error states.**
- Components: one component per file, PascalCase file names, props typed with an interface,
  ≤ ~150 lines — split if larger. Named exports except Next.js pages/layouts.
- Styling: Tailwind utility classes using theme tokens from `globals.css` (`bg-primary-600`,
  `text-secondary`, `border-default`). No hardcoded hex colors in components. Dark mode via `.dark`
  class on `<html>`.
- Accessibility: real `<button>`s, `aria-label` on icon buttons, labels on inputs, modals close on Esc
  and trap focus (shadcn Dialog handles this).
- `"use client"` only on components that need it.

## 6. Fireflies look & feel

Match the screenshots in `docs/reference/`. General traits:
- Left sidebar (white/very light, icons + labels): Home, Meetings, Uploads, Integrations, Analytics,
  Settings; logo at top; user/profile at bottom.
- Top navbar: global search bar, "Upload"/"+ New" button, notifications bell, avatar menu.
- Purple/violet primary accent, soft gray backgrounds, rounded-lg cards, subtle borders, generous spacing.
- Meeting detail: header (title, date, duration, participant avatars, actions menu) → left panel tabs
  (Summary / Action Items / Outline) → right panel transcript (speaker avatar + name + timestamp per
  block) → sticky player bar at the bottom with play/pause, seek bar, time, speed control.
- Toasts top-right/bottom; confirmation modal before deletes.

## 7. Code style & naming

- Python: snake_case functions/vars, PascalCase classes, type hints on every function, docstrings on
  services and non-obvious utils. Ruff + Black, line length 100.
- TS: camelCase vars/functions, PascalCase components/types, `kebab-case.ts` for non-component files.
  No `any` — use `unknown` and narrow. ESLint + Prettier.
- No magic numbers/strings: put them in constants or enums (`MeetingSource`, `GeneratedBy`).
- Comments explain *why*, not *what*. Keep the section-banner comment style for long files.
- DRY after the third repetition, not before.
- Small functions, early returns, no deep nesting.

## 8. Workflow rules for Claude

1. For any feature larger than a single small edit: **plan first** (list files to create/modify and
   the approach), wait for approval, then implement.
2. Build in **vertical slices**: model → schema → repository → service → router → test → frontend
   api → hook → component. One slice per session.
3. After implementing: run the relevant checks and fix failures before reporting done:
   - Backend: `cd backend && ruff check . && pytest -q`
   - Frontend: `cd frontend && npm run lint && npm run build`
4. Do not change `docs/schema.md` or `docs/api.md` silently — propose the change and update the doc
   in the same commit.
5. Do not add dependencies without saying why.
6. At the end of each slice, give a short explanation of the design decisions (the developer must be
   able to explain every line in an interview) and suggest a conventional commit message.
7. If something in this file conflicts with a request, point out the conflict instead of guessing.

## 9. Commands

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m app.seed.seed          # idempotent
uvicorn app.main:app --reload    # http://localhost:8000/docs
pytest -q
ruff check . && black --check .

# Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev                      # http://localhost:3000
npm run lint && npm run build
```

## 10. Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- Commit after every working slice. Never commit `.env`, `*.db`, `node_modules`, `.venv`.
