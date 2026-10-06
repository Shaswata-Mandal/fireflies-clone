Build the vertical slice: $ARGUMENTS

1. Re-read CLAUDE.md, docs/schema.md, docs/api.md, and the relevant part of docs/plan.md.
2. Enter plan mode: list every file you will create or modify and the approach. Wait for my approval.
3. Implement in order: model → schema → repository → service → router → tests → frontend api.ts →
   hooks.ts → components → page.
4. Run `cd backend && ruff check . && pytest -q` and/or `cd frontend && npm run lint && npm run build`.
   Fix all failures.
5. Tick the item in docs/plan.md. Add any non-obvious decision to docs/decisions.md.
6. Finish with: a 5–10 line explanation of the design I should be able to defend in an interview,
   and a conventional commit message.
