"""Logging setup. Absolute imports mean `import logging` here still resolves to the stdlib."""

import logging.config

LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"


def setup_logging(level: str) -> None:
    logging.config.dictConfig(
        {
            "version": 1,
            # Keep uvicorn's own loggers alive; we only add a root handler.
            "disable_existing_loggers": False,
            "formatters": {"default": {"format": LOG_FORMAT}},
            "handlers": {
                "console": {"class": "logging.StreamHandler", "formatter": "default"},
            },
            "root": {"handlers": ["console"], "level": level.upper()},
        }
    )
