import pytest
from fastapi.testclient import TestClient

from app.core.config import settings


def _client_with_failing_route(api: TestClient) -> TestClient:
    @api.app.get("/boom")
    def boom() -> None:
        raise RuntimeError("secret internal detail")

    return api


def test_production_500_hides_internal_details(
    api: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENV", "production")

    response = _client_with_failing_route(api).get("/boom")

    assert response.status_code == 500
    body = response.json()["error"]
    assert body == {"code": "INTERNAL_ERROR", "message": "Internal server error", "details": None}
    assert "secret internal detail" not in response.text


def test_development_500_includes_the_cause(
    api: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENV", "development")

    response = _client_with_failing_route(api).get("/boom")

    assert "secret internal detail" in response.json()["error"]["details"]


def test_docs_and_openapi_stay_enabled_in_production(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENV", "production")

    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200
