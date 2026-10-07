"""Per-request access log with a request id.

Pure ASGI instead of `BaseHTTPMiddleware`: that one wraps the response in a stream and is known to
interfere with background work and exceptions; this one only observes the `http.response.start`
message, so streaming exports are untouched.

WHAT: Middleware that gives each request an id, times it, and logs "METHOD path -> status in Xms".
LAYER: Core middleware, outermost-but-one wrapper around the whole app.
CALLED BY: main.py::create_app (`add_middleware`); logging.py uses `RequestIdFilter`.
CALLS: the next app in the chain (`self.app`), Python logging.
MERN EQUIVALENT: `morgan` plus an `express-request-id` middleware, written by hand.
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
# INTERVIEW: it is like Node's AsyncLocalStorage: a value tied to the current request's task.
request_id_var: ContextVar[str] = ContextVar("request_id", default=NO_REQUEST_ID)

access_logger = logging.getLogger("app.access")


class RequestIdFilter(logging.Filter):
    """Adds `%(request_id)s` to every log record so app logs and the access log can be joined."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Attach the current request id to a record.

        Args:
            record: the log record about to be formatted.
        Returns:
            Always True, meaning "keep this record"; we only decorate, never drop.
        """
        record.request_id = request_id_var.get()
        return True


def _incoming_request_id(headers: Headers) -> str:
    """Pick the request id: trust a safe client-supplied one, else generate a UUID.

    Args:
        headers: the incoming request headers.
    Returns:
        An id string of at most MAX_REQUEST_ID_LENGTH characters.
    Why it exists: lets a frontend or proxy correlate its own id with our server logs.
    """
    supplied = headers.get(REQUEST_ID_HEADER, "").strip()
    # Only printable ASCII, so a header cannot inject extra log lines.
    if supplied and supplied.isascii() and supplied.isprintable():
        return supplied[:MAX_REQUEST_ID_LENGTH]
    return uuid.uuid4().hex


class RequestLoggingMiddleware:
    """ASGI middleware: any class with `__init__(app)` and `async __call__(scope, receive, send)`.

    INTERVIEW: ASGI is Python's async equivalent of Node's http handler. `scope` describes the
    connection (like `req` metadata), `receive` reads body chunks, `send` writes the response.
    """

    def __init__(self, app: ASGIApp) -> None:
        """Remember the next app in the chain (like `next` in Express)."""
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Handle one connection: set the id, run the app, then log the outcome.

        Args:
            scope: connection info (type, method, path, headers).
            receive: async function to read the request body.
            send: async function to write response messages.
        Returns:
            None; the response is written via `send`.
        """
        # Websocket/lifespan events also pass through here; only HTTP gets logged.
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = _incoming_request_id(Headers(scope=scope))
        # `set` returns a token so we can restore the previous value in `finally`.
        token = request_id_var.set(request_id)
        started = time.perf_counter()  # monotonic high-resolution clock, right for durations
        status_code = 500  # stays 500 if the app raises before sending a response

        # A wrapper around `send` so we can peek at the response status and add our header.
        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code  # assign to the outer variable instead of creating a new local
            if message["type"] == "http.response.start":
                status_code = message["status"]
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            # `finally` guarantees one log line per request, even if the handler crashed.
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
