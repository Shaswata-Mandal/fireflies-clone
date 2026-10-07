import logging

import pytest
from fastapi.testclient import TestClient

from app.core.request_logging import RequestIdFilter


def _access_records(caplog: pytest.LogCaptureFixture) -> list[logging.LogRecord]:
    return [r for r in caplog.records if r.name == "app.access"]


def test_each_request_logs_method_path_status_and_duration(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger="app.access"):
        client.get("/health")

    (record,) = _access_records(caplog)
    message = record.getMessage()
    assert message.startswith("GET /health -> 200 in ")
    assert message.endswith("ms")


def test_request_id_is_generated_and_returned(client: TestClient) -> None:
    response = client.get("/health")

    assert len(response.headers["x-request-id"]) == 32


def test_incoming_request_id_is_reused_in_the_log(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.handler.addFilter(RequestIdFilter())  # the real handler has this filter (logging.py)

    with caplog.at_level(logging.INFO, logger="app.access"):
        response = client.get("/health", headers={"X-Request-ID": "abc-123"})

    assert response.headers["x-request-id"] == "abc-123"
    assert _access_records(caplog)[0].request_id == "abc-123"


def test_unknown_route_is_logged_with_404(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger="app.access"):
        client.get("/nope")

    assert "GET /nope -> 404" in _access_records(caplog)[0].getMessage()


def test_unhandled_error_is_logged_as_500(
    api: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    @api.app.get("/boom")
    def boom() -> None:
        raise RuntimeError("kaboom")

    with caplog.at_level(logging.INFO, logger="app.access"):
        response = api.get("/boom")

    assert response.status_code == 500
    assert "GET /boom -> 500" in _access_records(caplog)[0].getMessage()
