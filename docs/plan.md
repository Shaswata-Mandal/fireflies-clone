# Build Plan (~24h)

Each phase = one or more vertical slices. Commit after every slice. `/clear` between slices.
Tick boxes as you go — this file is also Claude's progress tracker.

## Phase 0 — Setup (1.5h)
- [ ] Sign up on Fireflies, capture screenshots into `docs/reference/` (sidebar, meetings list, meeting
      detail with summary + transcript + player, upload modal, settings, empty states, dark mode)
- [x] `git init`, first commit with CLAUDE.md + docs
- [x] Backend scaffold: venv, requirements, `core/` (config, database, exceptions, deps, logging),
      `main.py` with `/health`, Alembic init, Ruff/Black config, pytest config
- [x] Frontend scaffold: `create-next-app` (TS, Tailwind, App Router, src dir, ESLint), Prettier,
      TanStack Query + axios + react-hot-toast + lucide + shadcn init, `globals.css` tokens, folder layout
      (also done early: `api-client.ts` + `ApiError`, `query-client.ts`, `Providers`)

## Phase 1 — Backend data layer (3h)
- [x] Models for all tables in `docs/schema.md` + first Alembic migration
      (+ `get_current_user`; FTS5 `segments_fts` deferred to the Phase 5 global-search slice)
- [x] `utils/transcript_parser.py` (txt/vtt/json) + unit tests (most testable code in the app)
- [x] `utils/summary_generator.py`: `SummaryGenerator` protocol, `MockSummaryGenerator`
      (keyword frequency + chapter split by time + regex for "I'll / we need to / action:"),
      `LLMSummaryGenerator` (Grok/xAI via OpenAI-compatible API; only if key set)
- [ ] Seed: 6 meetings in `seed/data/*.json` — realistic, 60–150 segments each, 2–6 speakers,
      varied topics (product roadmap, sales call, hiring interview, sprint retro, customer onboarding,
      investor update), with summaries, chapters, action items (some completed). `seed.py` idempotent;
      also run on startup if DB empty (free hosts reset disk)

## Phase 2 — Backend API (3h)
- [ ] Meetings: list (filters, sort, pagination), read, create (JSON + upload), patch, delete
- [ ] Transcript: get, patch segment
- [ ] Action items: list, create, patch (complete toggle), delete; cross-meeting list
- [ ] Summary: generate, patch
- [ ] Participants list, `/me`
- [ ] Tests: 1 happy + 1 error test per router; cascade-delete test

## Phase 3 — Frontend shell + library (4h)
- [ ] App layout: Sidebar, Navbar (search, Upload button, bell, avatar menu), mobile drawer
- [ ] `api-client.ts` with error interceptor → toast, `query-client.ts`, query keys
- [ ] Meetings page: list/cards with title, date, duration, participant avatars, summary preview;
      search (debounced), participant filter, date-range filter, sort; skeleton/empty/error states
- [ ] Create meeting modal: tabs Upload file / Paste transcript / Manual form; react-hook-form + zod
- [ ] Placeholder pages: Integrations, Analytics, Team, Settings (Coming Soon cards styled like Fireflies)

## Phase 4 — Meeting detail (6h) ← highest weight
- [ ] Header: title (inline edit), date, duration, avatars, actions menu (Edit, Export, Delete w/ confirm)
- [ ] `PlayerProvider` + `PlayerBar` (play/pause, seek bar, time, ±15s, speed); simulated clock fallback
- [ ] Transcript panel: grouped speaker blocks, timestamps, active-line highlight + auto-scroll,
      click-to-seek
- [ ] Transcript search: highlight, n of m, prev/next
- [ ] Left panel tabs: Summary (overview, keywords chips, bullets), Action Items (add/edit/complete/
      delete, optimistic toggle, "jump to" timestamp), Outline/Chapters (click → seek)
- [ ] Edit meeting modal (title, participants)
- [ ] `?t=ms` deep link seeks on load

## Phase 5 — Bonus (2.5h, pick in order)
- [ ] Dark mode toggle
- [ ] Export TXT / Markdown
- [ ] Global search (FTS5) in navbar dropdown → deep link
- [ ] Home dashboard: recent meetings + open action items across meetings
- [ ] Ask about this meeting (LLM) — only if time remains

## Phase 6 — Ship (3h)
- [ ] Deploy backend (Render/Railway): start command runs `alembic upgrade head` + seed-if-empty
- [ ] Deploy frontend (Vercel) with `NEXT_PUBLIC_API_URL`; set backend `CORS_ORIGINS`
- [ ] README (setup, stack, architecture diagram, schema, API overview, assumptions, limitations)
- [ ] Full click-through on deployed URLs; fix; final commit
- [ ] Review `docs/decisions.md` — rehearse explaining each decision
