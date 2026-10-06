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
