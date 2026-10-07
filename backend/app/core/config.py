"""Application settings. The only place environment variables are read."""

from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_V1_PREFIX = "/api/v1"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENV: Literal["development", "test", "production"] = "development"
    LOG_LEVEL: str = "INFO"

    # Required: the app refuses to start without these.
    DATABASE_URL: str
    CORS_ORIGINS: list[str]  # JSON list in .env, e.g. ["http://localhost:3000"]

    # Optional regex for origins that change per deploy (Vercel preview URLs). Starlette matches it
    # against the whole origin, in addition to CORS_ORIGINS.
    CORS_ORIGIN_REGEX: str | None = None

    # Free hosts wipe the disk on redeploy, so the seed runs at startup when the DB is empty.
    SEED_ON_STARTUP: bool = True

    # Optional: when no key is set the deterministic mock summary generator is used.
    LLM_API_KEY: str | None = None
    # Grok (xAI) exposes an OpenAI-compatible API, so any compatible provider works via these two.
    LLM_BASE_URL: str = "https://api.x.ai/v1"
    LLM_MODEL: str = "grok-4"

    @field_validator("CORS_ORIGIN_REGEX")
    @classmethod
    def _blank_regex_is_none(cls, value: str | None) -> str | None:
        """`CORS_ORIGIN_REGEX=` in a .env file arrives as "", which must mean "not set"."""
        return value or None

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"


settings = Settings()
