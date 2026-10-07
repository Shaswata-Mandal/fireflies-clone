"""Per-request access log with a request id.

Pure ASGI instead of `BaseHTTPMiddleware`: that one wraps the response in a stream and is known to
interfere with background work and exceptions; this one only observes the `http.response.start`
message, so streaming exports are untouched.
"""

import logging
import time
import uuid
from contextvars import ContextVar

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_HEADER = "X-Request-ID"
NO_REQUEST_ID = "-"
MS_PER_SECOND = 1000
MAX_REQUEST_ID_LENGTH = 100  # a client-supplied id goes into our logs, so bound it

# A ContextVar (not a global) so concurrent requests each see their own id, in log lines emitted
# anywhere in the call stack, without passing it around.
request_id_var: ContextVar[str] = ContextVar("request_id", default=NO_REQUEST_ID)

access_logger = logging.getLogger("app.access")


class RequestIdFilter(logging.Filter):
    """Adds `%(request_id)s` to every log record so app logs and the access log can be joined."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def _incoming_request_id(headers: Headers) -> str:
    supplied = headers.get(REQUEST_ID_HEADER, "").strip()
    # Only printable ASCII, so a header cannot inject extra log lines.
    if supplied and supplied.isascii() and supplied.isprintable():
        return supplied[:MAX_REQUEST_ID_LENGTH]
    return uuid.uuid4().hex


class RequestLoggingMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = _incoming_request_id(Headers(scope=scope))
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        status_code = 500  # stays 500 if the app raises before sending a response

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            duration_ms = (time.perf_counter() - started) * MS_PER_SECOND
            access_logger.info(
                "%s %s -> %d in %.1fms",
                scope["method"],
                scope["path"],
                status_code,
                duration_ms,
                extra={"http_status": status_code},
            )
            request_id_var.reset(token)
