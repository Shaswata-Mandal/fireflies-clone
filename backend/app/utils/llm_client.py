"""The single door to the LLM provider (Groq). Everything else calls `generate_text`.

Pure util: no DB, no FastAPI. Failures are mapped to AppException subclasses so callers decide
whether they are fatal (ask → surface to the user) or not (summary → fall back to the mock).
Never log the API key or any prompt/transcript text: only the error type and HTTP status.

WHAT: A thin wrapper around the Groq SDK that sends one chat request and returns the reply text.
LAYER: Utility / external-service adapter.
CALLED BY: utils/summary_generator.py (summaries) and modules/ask/service.py (questions).
CALLS: the `groq` SDK, core/config.settings, core/exceptions.
MERN EQUIVALENT: a small `openai.js` helper wrapping `openai.chat.completions.create`.
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


# `TypedDict` describes the exact keys of a plain dict (like a TS object type); at runtime it is
# still just a dict. `Literal[...]` limits `role` to those two strings.
class ChatMessage(TypedDict):
    """One earlier turn of a conversation, as the frontend chat sends it."""

    role: Literal["user", "assistant"]
    content: str


def _create_client(api_key: str) -> Any:
    """Build a Groq SDK client. Split out so tests can replace it with a fake."""
    # max_retries=0: the SDK would otherwise retry 429s silently and stall the request.
    return Groq(api_key=api_key, timeout=LLM_TIMEOUT_SECONDS, max_retries=0)


def generate_text(
    prompt: str,
    context_messages: Sequence[ChatMessage] | None = None,
    system_instruction: str | None = None,
    temperature: float = DEFAULT_TEMPERATURE,
) -> str:
    """One chat completion: optional system message, prior turns, then `prompt` as the user turn.

    Args:
        prompt: the new user message.
        context_messages: earlier user/assistant turns, oldest first.
        system_instruction: optional "system" message that sets the model's behaviour.
        temperature: randomness (0 = deterministic, higher = more varied).
    Returns:
        The model's reply text (never empty).
    Raises:
        LLMNotConfiguredError, LLMRateLimitedError or LLMError (all AppExceptions).
    """
    if not settings.GROQ_API_KEY:
        raise LLMNotConfiguredError()

    # The chat API wants one list of {role, content} dicts, in conversation order.
    messages: list[dict[str, str]] = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    for message in context_messages or []:
        # Defensive: anything that isn't "assistant" is sent as "user".
        role = "assistant" if message["role"] == "assistant" else "user"
        messages.append({"role": role, "content": message["content"]})
    messages.append({"role": "user", "content": prompt})

    # INTERVIEW: catch broadly on purpose and translate to our own errors, so no provider detail
    # (or API key) ever leaks to the client and the HTTP status stays meaningful (429 vs 502).
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

    # The provider can answer 200 with an empty message; treat that as a failure too.
    if not content or not content.strip():
        raise LLMError()
    return content
