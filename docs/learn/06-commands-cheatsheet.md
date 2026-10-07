# 06 — Commands cheatsheet

Commands are from `CLAUDE.md` §9, `frontend/package.json` scripts, `docs/deployment.md` and `backend/scripts/start.sh`. Windows notes: the examples use Git Bash/POSIX syntax unless marked **PowerShell**. Always run backend commands **inside `backend/` with the venv active**.

## 1. First-time setup

### Backend

```bash
cd backend
python -m venv .venv                      # create the virtual environment (≈ a private node_modules)
source .venv/bin/activate                 # activate it (Git Bash: source .venv/Scripts/activate)
```
```powershell
.\.venv\Scripts\Activate.ps1              # PowerShell activation (cmd.exe: .venv\Scripts\activate)
```
```bash
pip install -r requirements-dev.txt       # runtime + pytest, httpx, ruff, black (use requirements.txt for prod only)
cp .env.example .env                      # PowerShell: Copy-Item .env.example .env ; then edit values
alembic upgrade head                      # create all tables in the SQLite file from the migrations
python -m app.seed.seed                   # insert default user + 4 demo meetings (skips if meetings exist)
```

### Frontend

```bash
cd frontend
npm install                               # install dependencies from package-lock.json
cp .env.example .env.local                # PowerShell: Copy-Item .env.example .env.local
```

## 2. Run (development)

| Command | What it does |
|---|---|
| `cd backend && uvicorn app.main:app --reload` | Start the API on http://localhost:8000 and reload on code changes. Docs at `/docs`. Seeds on boot if `SEED_ON_STARTUP=true` and no meetings. |
| `cd backend && uvicorn app.main:app --reload --port 8001` | Same, other port. |
| `cd frontend && npm run dev` | Start Next.js dev server on http://localhost:3000. |
| `curl http://localhost:8000/health` | Liveness: `{"status":"ok"}`. |
| `curl http://localhost:8000/health/db` | Readiness: runs `SELECT 1`. |
| `curl "http://localhost:8000/api/v1/meetings?limit=2"` | Quick API check. |
| `python -m app.seed.seed` | Run the seed by hand (idempotent). |

Both servers must run: the frontend calls `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`), and the backend's `CORS_ORIGINS` must include `http://localhost:3000`.

## 3. Test

| Command | What it does |
|---|---|
| `cd backend && pytest -q` | Whole backend suite (in-memory SQLite, no network). |
| `pytest -q tests/test_action_items.py` | One file. |
| `pytest -q tests/test_action_items.py::test_name` | One test. |
| `pytest -q -k "upload and not large"` | Tests whose name matches an expression. |
| `pytest -x -q` | Stop at the first failure. |
| `pytest -q tests/test_migrations.py` | Checks models and migrations haven't drifted (`alembic check`). Run after any model change. |
| `cd frontend && npm run test` | Vitest, once (pure-function unit tests). |
| `npx vitest` | Vitest in watch mode. |
| `python scripts/smoke.py http://localhost:8000` | End-to-end smoke test of a running API (from repo root). |

## 4. Lint, format, type-check, build

| Command | What it does |
|---|---|
| `cd backend && ruff check .` | Lint Python (rules E,F,I,B,UP,SIM,N). |
| `ruff check . --fix` | Auto-fix what Ruff can (imports order, etc.). |
| `black --check .` | Verify formatting without changing files. |
| `black .` | Reformat Python (line length 100). |
| `cd frontend && npm run lint` | ESLint (Next + TS + Prettier-compat). |
| `npm run format` | Prettier: rewrite files. |
| `npm run format:check` | Prettier: check only. |
| `npx tsc --noEmit` | Type-check TypeScript without building. |
| `npm run build` | Production build (`next build`). **Fails** if `NEXT_PUBLIC_API_URL` is unset and `NODE_ENV=production`. Also type-checks. |
| `npm run start` | Serve the production build locally (after `npm run build`). |

**"Definition of done" checks (CLAUDE.md §8.3):**
Backend: `cd backend && ruff check . && pytest -q`. Frontend: `cd frontend && npm run lint && npm run build`.

## 5. Database and migrations (Alembic)

Run from `backend/`.

| Command | What it does |
|---|---|
| `alembic upgrade head` | Apply all pending migrations. Safe to repeat (no-op at head). |
| `alembic current` | Show which revision this database is at. |
| `alembic history` | List all revisions. |
| `alembic revision --autogenerate -m "add meeting location"` | Diff models vs the DB and draft a new migration. **Review it before applying.** |
| `alembic revision -m "hand written"` | Empty migration (for things autogenerate can't see, e.g. FTS5 triggers). |
| `alembic downgrade -1` | Revert the last migration. |
| `alembic downgrade base` | Revert everything (drops all tables). |
| `alembic upgrade head --sql` | Print the SQL instead of executing it. |
| `alembic check` | Fail if models and migrations differ (also run by a test). |
| `alembic stamp head` | Mark the DB as up to date **without** running anything; only if the schema is already correct. |
| `DATABASE_URL=sqlite:///./tmp.db alembic upgrade head` | Try migrations against a throwaway DB (PowerShell: `$env:DATABASE_URL="sqlite:///./tmp.db"; alembic upgrade head`). |

## 6. Reset the database

SQLite is one file, so resetting is deleting it. **Stop the backend first.** Check the path in `DATABASE_URL` (default `backend/fireflies.db`).

```bash
cd backend
rm -f fireflies.db fireflies.db-wal fireflies.db-shm   # delete the DB (+ WAL files)
alembic upgrade head                                    # recreate the tables
python -m app.seed.seed                                 # re-insert the demo data
```
```powershell
cd backend
Remove-Item fireflies.db, fireflies.db-wal, fireflies.db-shm -ErrorAction SilentlyContinue
alembic upgrade head
python -m app.seed.seed
```

- "Reset but keep tables": `alembic downgrade base && alembic upgrade head && python -m app.seed.seed`.
- Starting uvicorn after deleting the file but **without** `alembic upgrade head` fails at seed time (tables missing). Migrate first.
- On Render the file is ephemeral: a redeploy is effectively a reset (migrate + re-seed on boot).

## 7. Deploy

Deployment details: `docs/deployment.md`. Hosts' dashboards change, so follow their current docs if a label differs.

| Step | Command / action | What it does |
|---|---|---|
| 1 | `git push origin main` | Render and Vercel (if connected to the repo) rebuild automatically. |
| 2 | Render → New → Blueprint → pick repo | Creates the backend service from `render.yaml`. Fill `CORS_ORIGINS` (JSON list), optional `CORS_ORIGIN_REGEX`, `GROQ_API_KEY`, `LLM_MODEL`. |
| 3 | (what Render runs) `pip install -r requirements.txt` | Build command. |
| 4 | (what Render runs) `sh scripts/start.sh` | `alembic upgrade head` then `uvicorn … --port $PORT --no-access-log`. App seeds itself on startup when the DB is empty. |
| 5 | Vercel → Add Project → Root Directory `frontend` | Frontend; set `NEXT_PUBLIC_API_URL=https://<api>.onrender.com/api/v1` **before** the first build (baked in; change = redeploy). |
| 6 | Render → Environment → `CORS_ORIGINS=["https://<app>.vercel.app"]` | Allow the deployed frontend; Render redeploys. |
| 7 | `python scripts/smoke.py https://<api>.onrender.com` | Checks `/health`, `/health/db`, seeded meetings, create → read → delete → 404. Exit code ≠ 0 on failure. |
| 8 | `curl -i -H "Origin: https://<app>.vercel.app" https://<api>.onrender.com/health` | Should include `access-control-allow-origin`. Debugs CORS. |

Run the production start script locally (Git Bash / Linux / macOS):

```bash
cd backend && PORT=8000 sh scripts/start.sh
```

Optionally mark the script executable in git (not required, Render runs it via `sh`): `git update-index --chmod=+x backend/scripts/start.sh`.

## 8. Git (conventions from CLAUDE.md §10)

| Command | What it does |
|---|---|
| `git status` / `git diff` | See what changed. |
| `git add docs/learn && git commit -m "docs: add learning guides"` | Commit these guides with a conventional message (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`). |
| `git log --oneline -10` | Recent history. |

Never commit `.env`, `*.db`, `node_modules`, `.venv` (all git-ignored).

## 9. Handy one-offs

| Command | What it does |
|---|---|
| `pip list` / `pip freeze` | See installed Python packages (inside the venv). |
| `python --version` | Should be 3.12 (3.11+ supported). |
| `which python` (Git Bash) / `(Get-Command python).Source` (PowerShell) | Confirms you are using the venv's Python. |
| `npm ls <pkg>` | Why/where an npm package is installed. |
| `npx next info` | Print Next.js/environment info for bug reports. |
| `rm -rf .next` (in `frontend/`) | Clear the Next.js cache when the dev server behaves oddly. |
| open `http://localhost:8000/docs` | Interactive Swagger UI for every endpoint. |
