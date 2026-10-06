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
