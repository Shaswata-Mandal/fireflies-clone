"""Logging setup. Absolute imports mean `import logging` here still resolves to the stdlib."""

import logging.config

from app.core.request_logging import RequestIdFilter

LOG_FORMAT = "%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"


def setup_logging(level: str) -> None:
    logging.config.dictConfig(
        {
            "version": 1,
            # Keep uvicorn's own loggers alive; we only add a root handler.
            "disable_existing_loggers": False,
            "filters": {"request_id": {"()": RequestIdFilter}},
            "formatters": {"default": {"format": LOG_FORMAT}},
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "filters": ["request_id"],
                    "stream": "ext://sys.stdout",  # hosts collect stdout (the default is stderr)
                },
            },
            "root": {"handlers": ["console"], "level": level.upper()},
        }
    )
