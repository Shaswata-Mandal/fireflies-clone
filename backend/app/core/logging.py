"""Logging setup. Absolute imports mean `import logging` here still resolves to the stdlib.

WHAT: Configures Python's `logging` once so every log line prints time, level, request id, the
    logger name and the message to stdout.
LAYER: Core infrastructure.
CALLED BY: main.py::create_app at startup.
CALLS: request_logging.RequestIdFilter (adds the request id to each record).
MERN EQUIVALENT: configuring `winston` or `pino` once at app start, plus a request-id
    middleware.
"""

import logging.config

from app.core.request_logging import RequestIdFilter

# `%(request_id)s` is not built in; RequestIdFilter fills it in on every record.
LOG_FORMAT = "%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"


def setup_logging(level: str) -> None:
    """Install the console handler on the root logger.

    Args:
        level: a level name such as "INFO" or "debug" (case-insensitive).
    Returns:
        None; configures global logging state as a side effect.
    Why it exists: one dictConfig call keeps all logging rules in one readable structure.
    """
    # dictConfig is Python's declarative logging setup (schema version 1): filters -> formatters
    # -> handlers -> root logger.
    logging.config.dictConfig(
        {
            "version": 1,
            # Keep uvicorn's own loggers alive; we only add a root handler.
            "disable_existing_loggers": False,
            # "()" means "call this factory to build the filter object".
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
