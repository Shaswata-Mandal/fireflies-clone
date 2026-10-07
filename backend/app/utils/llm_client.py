"""The single door to the LLM provider (Groq). Everything else calls `generate_text`.

Pure util: no DB, no FastAPI. Failures are mapped to AppException subclasses so callers decide
whether they are fatal (ask → surface to the user) or not (summary → fall back to the mock).
Never log the API key or any prompt/transcript text: only the error type and HTTP status.
"""

import logging
from collections.abc import Sequence
from typing import Any, Literal, TypedDict

from groq import APIStatusError, Groq

from app.core.config import settings
from app.core.exceptions import LLMError, LLMNotConfiguredError, LLMRateLimitedError

logger = logging.getLogger(__name__)

HTTP_TOO_MANY_REQUESTS = 429
LLM_TIMEOUT_SECONDS = 30.0
# Groq's free tier resets its per-minute limits, so a minute is the honest "try again" hint.
RATE_LIMIT_RETRY_AFTER_SECONDS = 60
DEFAULT_TEMPERATURE = 0.7


class ChatMessage(TypedDict):
    role: Literal["user", "assistant"]
    content: str


def _create_client(api_key: str) -> Any:
    # max_retries=0: the SDK would otherwise retry 429s silently and stall the request.
    return Groq(api_key=api_key, timeout=LLM_TIMEOUT_SECONDS, max_retries=0)


def generate_text(
    prompt: str,
    context_messages: Sequence[ChatMessage] | None = None,
    system_instruction: str | None = None,
    temperature: float = DEFAULT_TEMPERATURE,
) -> str:
    """One chat completion: optional system message, prior turns, then `prompt` as the user turn."""
    if not settings.GROQ_API_KEY:
        raise LLMNotConfiguredError()

    messages: list[dict[str, str]] = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    for message in context_messages or []:
        role = "assistant" if message["role"] == "assistant" else "user"
        messages.append({"role": role, "content": message["content"]})
    messages.append({"role": "user", "content": prompt})

    try:
        response = _create_client(settings.GROQ_API_KEY).chat.completions.create(
            model=settings.LLM_MODEL, messages=messages, temperature=temperature
        )
        content = response.choices[0].message.content
    except Exception as exc:  # noqa: BLE001 - every provider failure maps to an app error
        status_code = exc.status_code if isinstance(exc, APIStatusError) else None
        logger.warning("LLM request failed (%s, status=%s)", type(exc).__name__, status_code)
        if status_code == HTTP_TOO_MANY_REQUESTS:
            raise LLMRateLimitedError(RATE_LIMIT_RETRY_AFTER_SECONDS) from exc
        raise LLMError() from exc

    if not content or not content.strip():
        raise LLMError()
    return content
