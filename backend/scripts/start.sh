#!/bin/sh
# Production entrypoint: apply migrations, then serve. Runs on Linux (Render) as
#   sh scripts/start.sh
# Using `sh` means it works even if the executable bit was lost on a Windows checkout
# (to set it in git: git update-index --chmod=+x backend/scripts/start.sh).
#
# `alembic upgrade head` is a no-op when the DB is already at head, so running it on every boot is
# safe. If it fails, `set -e` stops the script and the deploy fails instead of serving a broken schema.
# Seeding is not done here: the app seeds itself on startup when SEED_ON_STARTUP=true and the DB
# has no meetings (see app/main.py).
#
# WHAT: the one command Render runs to start the backend (see render.yaml `startCommand`).
# LAYER: deployment glue, outside the Python app.
# MERN EQUIVALENT: the `"start"` script in package.json, e.g. `"npx knex migrate:latest && node server.js"`.
#
# `set -e` = stop at the first failing command; `set -u` = treat an unset variable as an error.
set -eu

# alembic.ini and the `app` package resolve relative to backend/, wherever this is invoked from.
# `$0` is this script's path; `dirname` gives its folder (backend/scripts); `/..` goes up to backend/.
cd "$(dirname "$0")/.."

# Bring the database schema up to the latest migration (creates the tables on a fresh disk).
alembic upgrade head
# --no-access-log: our RequestLoggingMiddleware already logs each request (with its request id).
# exec: uvicorn replaces the shell, so the host's SIGTERM reaches it directly for a clean shutdown.
# --host 0.0.0.0: listen on all interfaces (needed inside a container); `${PORT:-8000}` uses the
# PORT variable the host injects, or 8000 when it is not set.
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --no-access-log
