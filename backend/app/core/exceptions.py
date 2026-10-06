"""Application exceptions and the handlers that render every error in one envelope:

{"error": {"code": "MEETING_NOT_FOUND", "message": "Meeting 12 not found", "details": null}}
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
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class NotFoundError(AppException):
    def __init__(self, code: str, message: str, details: Any = None) -> None:
        super().__init__(code, message, status.HTTP_404_NOT_FOUND, details)


class ValidationError(AppException):
    def __init__(self, message: str, code: str = "VALIDATION_ERROR", details: Any = None) -> None:
        super().__init__(code, message, status.HTTP_422_UNPROCESSABLE_CONTENT, details)


class ConflictError(AppException):
    def __init__(self, message: str, code: str = "CONFLICT", details: Any = None) -> None:
        super().__init__(code, message, status.HTTP_409_CONFLICT, details)


class UnsupportedFileError(AppException):
    def __init__(self, message: str, code: str = "UNSUPPORTED_FILE", details: Any = None) -> None:
        super().__init__(code, message, status.HTTP_400_BAD_REQUEST, details)


class FileTooLargeError(AppException):
    def __init__(self, message: str, code: str = "FILE_TOO_LARGE", details: Any = None) -> None:
        super().__init__(code, message, status.HTTP_413_CONTENT_TOO_LARGE, details)


class TranscriptParseError(AppException):
    """Transcript content is malformed; `details` says where (`line` or `segment`)."""

    def __init__(self, message: str, details: Any = None) -> None:
        super().__init__("TRANSCRIPT_PARSE_ERROR", message, status.HTTP_400_BAD_REQUEST, details)


class EmptyTranscriptError(AppException):
    def __init__(self, message: str = "Transcript contains no segments") -> None:
        super().__init__("EMPTY_TRANSCRIPT", message, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------


def _error_response(status_code: int, code: str, message: str, details: Any = None) -> JSONResponse:
    body = {"error": {"code": code, "message": message, "details": details}}
    return JSONResponse(status_code=status_code, content=jsonable_encoder(body))


async def _app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
    return _error_response(exc.status_code, exc.code, exc.message, exc.details)


async def _request_validation_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = [
        {"loc": list(err["loc"]), "msg": err["msg"], "type": err["type"]} for err in exc.errors()
    ]
    return _error_response(
        status.HTTP_422_UNPROCESSABLE_CONTENT, "VALIDATION_ERROR", "Invalid request", details
    )


async def _http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    # Framework-level errors: unknown route (404), wrong method (405), etc.
    is_not_found = exc.status_code == status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND" if is_not_found else f"HTTP_{exc.status_code}"
    return _error_response(exc.status_code, code, str(exc.detail))


async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    # Never leak internals in production; in development the message speeds up debugging.
    details = None if settings.is_production else f"{type(exc).__name__}: {exc}"
    return _error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Internal server error", details
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppException, _app_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, _request_validation_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, _unhandled_exception_handler)
