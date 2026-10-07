"""App factory: logging, CORS, error handlers, routers.

WHAT: The entry point of the backend. `app = create_app()` at the bottom builds the one FastAPI
    object that uvicorn serves (`uvicorn app.main:app`).
LAYER: Composition root. It owns no business logic; it only wires middleware, error handlers and
    the module routers together.
CALLED BY: uvicorn (production and `--reload` dev), and the pytest TestClient in tests/conftest.py.
CALLS: core/* (settings, logging, middleware, exception handlers), every `modules/*/router.py`,
    and `seed/seed.py` once at startup.
MERN EQUIVALENT: `server.js` / `app.js` in Express, where you do `app.use(cors())`,
    `app.use('/api/v1/meetings', meetingsRouter)` and `app.use(errorHandler)`.
"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (registers all models so cross-module relationships resolve)
from app.core.config import API_V1_PREFIX, settings
from app.core.database import SessionLocal
from app.core.exceptions import register_exception_handlers
from app.core.health import router as health_router
from app.core.logging import setup_logging
from app.core.request_logging import RequestLoggingMiddleware
from app.modules.action_items.router import router as action_items_router
from app.modules.ask.router import router as ask_router
from app.modules.exports.router import router as exports_router
from app.modules.meetings.router import router as meetings_router
from app.modules.participants.router import router as participants_router
from app.modules.summaries.router import router as summaries_router
from app.modules.transcripts.router import router as transcripts_router
from app.modules.users.router import router as users_router
from app.seed.seed import seed_if_empty

# `__name__` is "app.main", so log lines show which file produced them.
logger = logging.getLogger(__name__)


# `@asynccontextmanager` turns this generator into a context manager: code before `yield` runs at
# server startup, code after `yield` would run at shutdown. FastAPI's `lifespan` hook expects it.
@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Run once when the server boots (and once on shutdown, where we have nothing to do).

    Args:
        _app: the FastAPI instance; unused, hence the leading underscore.
    Yields:
        Nothing; control returns to FastAPI, which then serves requests.
    Why it exists: free hosts wipe the disk on redeploy, so seed on boot when enabled and the DB
    is empty.
    """
    if settings.SEED_ON_STARTUP:
        # `with` closes the session automatically, like try/finally. This is a one-off session,
        # not a request-scoped one, so we cannot use the `get_db` dependency here.
        with SessionLocal() as db:
            if seed_if_empty(db):
                logger.info("Seeded empty database")
    yield


def create_app() -> FastAPI:
    """Build and configure the FastAPI application.

    Returns:
        A ready-to-serve FastAPI app.
    Why a factory function: nothing is built at import time except by the last line of this
    file, and tests can call it again for a fresh app if they need to.
    """
    setup_logging(settings.LOG_LEVEL)

    # `lifespan=` registers the startup/shutdown hook above. Title/version show up in /docs.
    app = FastAPI(title="Fireflies Clone API", version="0.1.0", lifespan=lifespan)

    # INTERVIEW: middleware order. Starlette wraps each new middleware around the previous ones,
    # so the LAST added is the OUTERMOST. Request flow: CORS -> logging -> router.
    # Added first = innermost; CORS wraps it and answers preflights itself, so those aren't logged.
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        # Exact origins from env (e.g. the Vercel URL) plus an optional regex for preview URLs.
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=settings.CORS_ORIGIN_REGEX,
        # Lets the browser send cookies/auth headers. Harmless today (no auth), future-proof.
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        # Browsers hide non-safelisted response headers cross-origin; the frontend needs the
        # export filename from Content-Disposition.
        expose_headers=["Content-Disposition"],
    )
    # The Express `app.use((err, req, res, next) => ...)` equivalent; see core/exceptions.py.
    register_exception_handlers(app)

    # Health routes live at /health, outside the versioned API prefix (hosts ping them).
    app.include_router(health_router)

    # Feature routers are included here under API_V1_PREFIX as modules are built.
    # Same as Express `app.use('/api/v1', router)`; each router declares its own sub-path.
    for router in (
        meetings_router,
        transcripts_router,
        action_items_router,
        summaries_router,
        ask_router,
        participants_router,
        exports_router,
        users_router,
    ):
        app.include_router(router, prefix=API_V1_PREFIX)

    return app


# The module-level object uvicorn imports ("app.main:app" = file app/main.py, variable app).
app = create_app()
