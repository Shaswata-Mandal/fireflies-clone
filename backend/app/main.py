"""App factory: logging, CORS, error handlers, routers."""

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
from app.modules.exports.router import router as exports_router
from app.modules.meetings.router import router as meetings_router
from app.modules.participants.router import router as participants_router
from app.modules.summaries.router import router as summaries_router
from app.modules.transcripts.router import router as transcripts_router
from app.modules.users.router import router as users_router
from app.seed.seed import seed_if_empty

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Free hosts wipe the disk on redeploy, so seed on boot when enabled and the DB is empty."""
    if settings.SEED_ON_STARTUP:
        with SessionLocal() as db:
            if seed_if_empty(db):
                logger.info("Seeded empty database")
    yield


def create_app() -> FastAPI:
    setup_logging(settings.LOG_LEVEL)

    app = FastAPI(title="Fireflies Clone API", version="0.1.0", lifespan=lifespan)

    # Added first = innermost; CORS wraps it and answers preflights itself, so those aren't logged.
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=settings.CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        # Browsers hide non-safelisted response headers cross-origin; the frontend needs the
        # export filename from Content-Disposition.
        expose_headers=["Content-Disposition"],
    )
    register_exception_handlers(app)

    app.include_router(health_router)

    # Feature routers are included here under API_V1_PREFIX as modules are built.
    for router in (
        meetings_router,
        transcripts_router,
        action_items_router,
        summaries_router,
        participants_router,
        exports_router,
        users_router,
    ):
        app.include_router(router, prefix=API_V1_PREFIX)

    return app


app = create_app()
