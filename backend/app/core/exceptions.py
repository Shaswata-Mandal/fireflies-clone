"""Application exceptions and the handlers that render every error in one envelope:

{"error": {"code": "MEETING_NOT_FOUND", "message": "Meeting 12 not found", "details": null}}

WHAT: The `AppException` family that services raise, plus the global handlers that turn any error
    (ours, validation, framework, unexpected) into that one JSON shape.
LAYER: Core. Services raise these; handlers sit at the edge of the HTTP layer.
CALLED BY: every service.py (raises), main.py (calls `register_exception_handlers`). The
    frontend's `api-error.ts` reads the envelope.
CALLS: config.settings (production check), FastAPI/Starlette response helpers.
MERN EQUIVALENT: custom `class NotFoundError extends Error` plus the final
    `app.use((err, req, res, next) => ...)` error-handling middleware.
"""

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Exception hierarchy (raised by services, never by routers)
# ---------------------------------------------------------------------------


class AppException(Exception):  # noqa: N818 — name fixed by CLAUDE.md
    """Base for expected business errors. Services raise these; the global handler renders them."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Any = None,
    ) -> None:
        """Create an error.

        Args:
            code: stable machine-readable id, e.g. "MEETING_NOT_FOUND" (frontend switches on it).
            message: human-readable text shown to the user.
            status_code: HTTP status to answer with (default 400).
            details: optional extra data (field errors, retry_after...).
        """
        super().__init__(message)  # keeps `str(exc)` meaningful in logs
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


# INTERVIEW: subclasses only pin the HTTP status (and a default code), so a service reads
# `raise NotFoundError(...)` without knowing about HTTP numbers.
class NotFoundError(AppException):
    """The requested row does not exist (or is not owned by the user). HTTP 404."""

    def __init__(self, code: str, message: str, details: Any = None) -> None:
        super().__init__(code, message, status.HTTP_404_NOT_FOUND, details)


class ValidationError(AppException):
    """A business-rule validation failure (not Pydantic's own). HTTP 422."""

    def __init__(self, message: str, code: str = "VALIDATION_ERROR", details: Any = None) -> None:
        super().__init__(code, message, status.HTTP_422_UNPROCESSABLE_CONTENT, details)


class ConflictError(AppException):
    """The request clashes with current state, e.g. a duplicate. HTTP 409."""

    def __init__(self, message: str, code: str = "CONFLICT", details: Any = None) -> None:
        super().__init__(code, message, status.HTTP_409_CONFLICT, details)


class UnsupportedFileError(AppException):
    """An uploaded file has a type we cannot parse. HTTP 400."""

    def __init__(self, message: str, code: str = "UNSUPPORTED_FILE", details: Any = None) -> None:
        super().__init__(code, message, status.HTTP_400_BAD_REQUEST, details)


class FileTooLargeError(AppException):
    """An upload exceeds the size limit. HTTP 413."""

    def __init__(self, message: str, code: str = "FILE_TOO_LARGE", details: Any = None) -> None:
        super().__init__(code, message, status.HTTP_413_CONTENT_TOO_LARGE, details)


class TranscriptParseError(AppException):
    """Transcript content is malformed; `details` says where (`line` or `segment`)."""

    def __init__(self, message: str, details: Any = None) -> None:
        super().__init__("TRANSCRIPT_PARSE_ERROR", message, status.HTTP_400_BAD_REQUEST, details)


class EmptyTranscriptError(AppException):
    """The parsed transcript has zero segments, so there is nothing to store. HTTP 400."""

    def __init__(self, message: str = "Transcript contains no segments") -> None:
        super().__init__("EMPTY_TRANSCRIPT", message, status.HTTP_400_BAD_REQUEST)


class LLMNotConfiguredError(AppException):
    """No GROQ_API_KEY is set, so AI features are off. HTTP 503."""

    def __init__(self, message: str = "AI features are not configured on this server") -> None:
        super().__init__("LLM_NOT_CONFIGURED", message, status.HTTP_503_SERVICE_UNAVAILABLE)


class LLMRateLimitedError(AppException):
    """The provider answered 429. `details.retry_after` is how long the client should wait (s)."""

    def __init__(self, retry_after: int) -> None:
        super().__init__(
            "LLM_RATE_LIMITED",
            f"The AI provider is rate limited. Try again in {retry_after} seconds.",
            status.HTTP_429_TOO_MANY_REQUESTS,
            {"retry_after": retry_after},
        )
        self.retry_after = retry_after


class LLMError(AppException):
    """Any other provider failure (timeout, 5xx, empty reply). Provider details stay in the logs."""

    def __init__(self, message: str = "The AI provider failed to answer") -> None:
        super().__init__("LLM_ERROR", message, status.HTTP_502_BAD_GATEWAY)


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------


def _error_response(status_code: int, code: str, message: str, details: Any = None) -> JSONResponse:
    """Build the one error envelope every handler returns.

    Args:
        status_code: HTTP status for the response.
        code: machine-readable error code.
        message: human-readable text.
        details: optional extra info (may hold non-JSON types, so it is encoded below).
    Returns:
        A JSONResponse shaped like {"error": {"code", "message", "details"}}.
    Why it exists: guarantees the frontend sees one shape no matter what failed.
    """
    body = {"error": {"code": code, "message": message, "details": details}}
    # jsonable_encoder converts things like datetimes/Pydantic objects into plain JSON types.
    return JSONResponse(status_code=status_code, content=jsonable_encoder(body))


# Handlers are `async def` because FastAPI/Starlette call them on the event loop.
# `_request` is unused (leading underscore) but the handler signature requires it.
async def _app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
    """Render any AppException (and subclasses) using its own code, message and status."""
    return _error_response(exc.status_code, exc.code, exc.message, exc.details)


async def _request_validation_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Render Pydantic's request validation failures (bad body/query/path) as HTTP 422.

    Why it exists: FastAPI's default 422 body has its own shape; this swaps in our envelope.
    """
    # `exc.errors()` gives one dict per failing field; keep only the parts the frontend needs.
    details = [
        {"loc": list(err["loc"]), "msg": err["msg"], "type": err["type"]} for err in exc.errors()
    ]
    return _error_response(
        status.HTTP_422_UNPROCESSABLE_CONTENT, "VALIDATION_ERROR", "Invalid request", details
    )


async def _http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Render framework-raised HTTP errors (unknown route, wrong method) in our envelope."""
    # Framework-level errors: unknown route (404), wrong method (405), etc.
    is_not_found = exc.status_code == status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND" if is_not_found else f"HTTP_{exc.status_code}"
    return _error_response(exc.status_code, code, str(exc.detail))


async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Last-resort handler for any bug we did not anticipate. Logs it and answers HTTP 500."""
    # `logger.exception` logs at ERROR level and includes the full stack trace.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    # Never leak internals in production; in development the message speeds up debugging.
    details = None if settings.is_production else f"{type(exc).__name__}: {exc}"
    return _error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Internal server error", details
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach all four handlers to the app.

    Args:
        app: the FastAPI instance being built in main.py.
    Returns:
        None.
    INTERVIEW: FastAPI picks the handler whose exception class is the closest match, so the
    specific ones win and `Exception` only catches what is left.
    """
    # The `type: ignore` comments silence a typing quirk: our handlers take a narrower exception
    # type than FastAPI's declared callback type. They work correctly at runtime.
    app.add_exception_handler(AppException, _app_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, _request_validation_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, _unhandled_exception_handler)
