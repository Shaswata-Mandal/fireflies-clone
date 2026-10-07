# Deployment

Two services: the **FastAPI backend on Render** and the **Next.js frontend on Vercel**. Deploy the backend
first, because the frontend needs its URL at build time, then come back and tell the backend the frontend's URL.

Order at a glance:

1. Render: create the backend service (CORS not final yet) → note its URL.
2. Vercel: create the frontend project with `NEXT_PUBLIC_API_URL` set to the backend URL → note its URL.
3. Render: set `CORS_ORIGINS` to the Vercel URL → redeploy.
4. Run the smoke test.

Hosts change plans, limits and UI labels. Field names below match the dashboards at the time of writing; if one
differs, follow the host's current documentation and terms.

---

## 1. Backend on Render

### Option A — Blueprint (recommended)

1. Push the repo to GitHub.
2. Render dashboard → **New → Blueprint** → pick the repo. Render reads [`render.yaml`](../render.yaml).
3. When prompted for the variables marked `sync: false`, fill in:

   | Variable | Value |
   |---|---|
   | `CORS_ORIGINS` | `["http://localhost:3000"]` for now (a JSON list, with the quotes). You fix it in step 3 below. |
   | `CORS_ORIGIN_REGEX` | Leave empty, or `https://<project>-.*\.vercel\.app` to allow Vercel preview deployments. |
   | `GROQ_API_KEY` | Leave empty to use the built-in mock summary generator (asking questions then returns 503). Set it to use Groq. |
   | `LLM_MODEL` | Leave empty to use the default (`openai/gpt-oss-20b`). |

4. Apply. Wait for the deploy to go live, then copy the service URL (`https://<name>.onrender.com`).

### Option B — manual web service

**New → Web Service** → connect the repo, then:

| Field | Value |
|---|---|
| Language / Runtime | Python 3 |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `sh scripts/start.sh` |
| Health Check Path | `/health` |

Environment variables:

| Variable | Value |
|---|---|
| `PYTHON_VERSION` | `3.12` (same as `backend/.python-version`) |
| `ENV` | `production` |
| `DATABASE_URL` | `sqlite:///./fireflies.db` (ephemeral; see persistence below) |
| `CORS_ORIGINS` | `["http://localhost:3000"]` for now |
| `SEED_ON_STARTUP` | `true` |
| `LOG_LEVEL` | `INFO` |
| `CORS_ORIGIN_REGEX`, `GROQ_API_KEY`, `LLM_MODEL` | optional, as above |

### What the start command does

`backend/scripts/start.sh` runs `alembic upgrade head` and then `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`.
Render provides `PORT`. Migrations run on every boot; when the database is already at head this does nothing. If a
migration fails the script exits and the deploy fails, rather than serving a broken schema. Seeding happens inside the
app on startup when `SEED_ON_STARTUP=true` **and** the database has no meetings; it never touches a populated database.

The script uses `sh` so it runs on Linux even if the executable bit is missing. (To set the bit in git:
`git update-index --chmod=+x backend/scripts/start.sh`.)

### Verify the backend

- `https://<backend>/health` → `{"status":"ok"}`
- `https://<backend>/health/db` → `{"status":"ok"}`
- `https://<backend>/docs` → the interactive API docs (kept on in production on purpose).

---

## 2. Frontend on Vercel

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory**: `frontend`. Framework preset: Next.js (detected). Build and output settings: leave the defaults.
3. **Environment Variables** (add before the first deploy):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<backend>.onrender.com/api/v1` (include `/api/v1`, no trailing slash) |

   It is inlined into the JavaScript at **build time**, so changing it later requires a redeploy. If it is missing, the
   production build fails with `NEXT_PUBLIC_API_URL is not set…` instead of quietly pointing at localhost.
4. Deploy and copy the URL (`https://<project>.vercel.app`).

## 3. Connect them (CORS)

Back in Render → the service → **Environment**:

- `CORS_ORIGINS` = `["https://<project>.vercel.app"]` (exact origin: `https` scheme, no path, no trailing slash).
- Optional, for preview deployments: `CORS_ORIGIN_REGEX` = `https://<project>-.*\.vercel\.app`.

Save; Render redeploys. Then open the Vercel URL and click through the app.

## 4. Smoke test

From any machine with Python 3.11+ (standard library only):

```bash
python scripts/smoke.py https://<backend>.onrender.com
```

It checks `/health`, `/health/db`, that at least one meeting is seeded, then creates, reads and deletes a meeting and
confirms the 404 afterwards. Each step prints `PASS` or `FAIL`; the exit code is non-zero if anything failed. Locally:
`python scripts/smoke.py http://localhost:8000`.

---

## Data persistence (SQLite)

The database is a single SQLite file. On a host with an **ephemeral filesystem** the file is discarded when the
service is rebuilt or moved to a new instance, so meetings, edits and uploads made by users disappear. Whether and when
this happens depends on the host and plan: check the host's current terms. Options:

1. **Re-seed on boot (default).** `SEED_ON_STARTUP=true` restores the demo meetings whenever the database is empty,
   so the app is never blank. User changes are still lost. Fine for a demo or assignment review.
2. **Persistent disk.** Attach a disk and point `DATABASE_URL` at it so the file survives deploys:
   - In [`render.yaml`](../render.yaml) uncomment the `disk:` block (mounted at `/var/data`) or add an equivalent disk
     in the dashboard.
   - Set `DATABASE_URL=sqlite:////var/data/fireflies.db` (four slashes = absolute path). The app creates missing parent
     folders itself.
   - Disks are only available on some plans and may cost money, and a service with a disk generally runs a single
     instance. Check Render's current documentation and pricing.
3. **A different database** (e.g. managed Postgres) would also work, but needs a Postgres driver and has not been
   tested here; it is outside this project's scope.

## Cold starts

Hosts may stop idle services and start them again on the next request. The first request after that can take a while
(the service boots, runs migrations and may seed) and the frontend may show its loading or error state meanwhile; a
refresh a moment later works. Check your host's current behaviour and terms. The smoke test uses a 60-second timeout
per request for this reason.

---

## Troubleshooting

**Browser console says "blocked by CORS policy" / requests fail only from the deployed frontend**
- `CORS_ORIGINS` must contain the *exact* frontend origin, as a JSON list: `["https://<project>.vercel.app"]`. No
  trailing slash, no path, correct scheme. Single quotes or a bare URL will not parse.
- A preview URL like `https://<project>-git-branch-team.vercel.app` is a different origin: set `CORS_ORIGIN_REGEX`.
- Confirm from a terminal:
  `curl -i -H "Origin: https://<project>.vercel.app" https://<backend>/health` should include `access-control-allow-origin`.
- The frontend calls the wrong host: `NEXT_PUBLIC_API_URL` is baked in at build time; fix it and **redeploy** the
  frontend (a restart is not enough). It must end in `/api/v1`.

**Backend returns 500 or the service fails on boot**
- Open the service **Logs** in Render. Every request logs `METHOD /path -> status in Nms` with a request id; the
  response also carries an `X-Request-ID` header, so you can match a failing response to its log lines.
- With `ENV=production` the 500 body hides the cause (`"details": null`); the stack trace is in the logs.
- `ValidationError ... CORS_ORIGINS` / `DATABASE_URL Field required`: a required variable is missing or malformed.
  `CORS_ORIGINS` must be valid JSON.
- `unable to open database file`: the path in `DATABASE_URL` is not writable. For a disk, the mount path and the URL
  must agree (`/var/data` ↔ `sqlite:////var/data/fireflies.db`, four slashes).
- `/health` works but `/health/db` returns 503: the app is up but cannot read the database; see the line above.
- Wrong Python version: `PYTHON_VERSION` / `backend/.python-version` should be `3.12`.

**Migration failures (deploy fails at `alembic upgrade head`)**
- The log shows the failing revision. Never edit a migration that has already been applied anywhere; add a new one.
- `table ... already exists` on an existing file: the database was created outside Alembic. Delete the file (or the
  disk contents) so it is rebuilt from migrations, or run `alembic stamp head` if the schema is known to match.
- Two instances sharing one database file, or a disk mounted read-only, can also break migrations; run a single instance.
- Reproduce locally: `cd backend && DATABASE_URL=sqlite:///./tmp.db alembic upgrade head`.

**`/api/v1/meetings` is empty after a deploy**
- `SEED_ON_STARTUP` must be `true` and the database must contain no meetings. A database with any meeting is
  deliberately left untouched.

**Smoke test fails with a connection error or timeout**
- The service may still be starting (see cold starts). Retry after a minute.
