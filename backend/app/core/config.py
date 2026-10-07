"""Application settings. The only place environment variables are read.

WHAT: A typed `Settings` class that loads env vars / the `.env` file once and exposes them as the
    single `settings` object.
LAYER: Core infrastructure (below every layer; anything may import it).
CALLED BY: almost everything: database.py (DB URL), main.py (CORS, seeding), exceptions.py
    (production check), the LLM client (API key).
CALLS: nothing in this repo; it uses pydantic-settings to read the environment.
MERN EQUIVALENT: `require('dotenv').config()` plus a `config.js` that reads `process.env`, except
    values are typed, validated, and missing required ones crash the app at startup.
"""

from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_V1_PREFIX = "/api/v1"


class Settings(BaseSettings):
    """All configuration for the backend, read from environment variables or `.env`.

    Why it exists: one typed place for config means no scattered `os.getenv` and a fast, clear
    failure when something required is missing.
    """

    # INTERVIEW: `BaseSettings` reads each field from an env var with the same name. Real env vars
    # win over the .env file. `extra="ignore"` stops unknown .env keys from raising errors.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # `Literal[...]` limits the value to those exact strings (like a TS union type); anything else
    # fails validation at startup. The `= "development"` part is the default.
    ENV: Literal["development", "test", "production"] = "development"
    LOG_LEVEL: str = "INFO"

    # Required: the app refuses to start without these.
    # (No default value = required. Pydantic raises a ValidationError at import time if missing.)
    DATABASE_URL: str
    # Pydantic parses the env string as JSON, so it must look like ["http://localhost:3000"].
    CORS_ORIGINS: list[str]  # JSON list in .env, e.g. ["http://localhost:3000"]

    # Optional regex for origins that change per deploy (Vercel preview URLs). Starlette matches it
    # against the whole origin, in addition to CORS_ORIGINS.
    # `str | None` means "a string or None" (TS: `string | null`).
    CORS_ORIGIN_REGEX: str | None = None

    # Free hosts wipe the disk on redeploy, so the seed runs at startup when the DB is empty.
    SEED_ON_STARTUP: bool = True

    # Optional: when no key is set the deterministic mock summary generator is used and
    # "ask a question" answers 503 LLM_NOT_CONFIGURED. Secret: never log it.
    GROQ_API_KEY: str | None = None
    LLM_MODEL: str = "openai/gpt-oss-20b"

    # `@field_validator` runs after Pydantic parses the field. `@classmethod` is required because
    # the validator runs on the class, not on an instance (so the first argument is `cls`).
    @field_validator("CORS_ORIGIN_REGEX")
    @classmethod
    def _blank_regex_is_none(cls, value: str | None) -> str | None:
        """`CORS_ORIGIN_REGEX=` in a .env file arrives as "", which must mean "not set"."""
        return value or None

    # `@property` lets you write `settings.is_production` (no parentheses), like a JS getter.
    @property
    def is_production(self) -> bool:
        """True when ENV=production; used to hide error internals from clients."""
        return self.ENV == "production"


# INTERVIEW: a module-level singleton. Python caches imported modules, so every
# `from app.core.config import settings` gets this same object (env is read exactly once).
settings = Settings()
