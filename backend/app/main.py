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
from app.core.logging import setup_logging
from app.modules.meetings.router import router as meetings_router
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

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)

    # Outside /api/v1 on purpose: it's for the host's health check, not the API contract.
    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # Feature routers are included here under API_V1_PREFIX as modules are built.
    app.include_router(meetings_router, prefix=API_V1_PREFIX)

    return app


app = create_app()
