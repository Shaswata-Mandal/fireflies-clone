import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, settings
from app.main import create_app

ALLOWED_ORIGIN = "http://testserver"


def test_cors_exposes_content_disposition(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": ALLOWED_ORIGIN})

    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    exposed = response.headers["access-control-expose-headers"].lower()
    assert "content-disposition" in exposed


def _make_client(monkeypatch: pytest.MonkeyPatch, regex: str | None) -> TestClient:
    monkeypatch.setattr(settings, "CORS_ORIGIN_REGEX", regex)
    return TestClient(create_app())


def test_origin_matching_the_regex_is_allowed(monkeypatch: pytest.MonkeyPatch) -> None:
    preview = "https://my-app-git-feature-team.vercel.app"
    client = _make_client(monkeypatch, r"https://my-app-.*\.vercel\.app")

    response = client.get("/health", headers={"Origin": preview})

    assert response.headers["access-control-allow-origin"] == preview


def test_origin_outside_list_and_regex_is_not_allowed(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _make_client(monkeypatch, r"https://my-app-.*\.vercel\.app")

    response = client.get("/health", headers={"Origin": "https://evil.example.com"})

    assert "access-control-allow-origin" not in response.headers


def test_regex_is_off_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _make_client(monkeypatch, None)

    response = client.get("/health", headers={"Origin": "https://my-app-x.vercel.app"})

    assert "access-control-allow-origin" not in response.headers


def test_blank_regex_setting_means_not_set() -> None:
    assert (
        Settings(DATABASE_URL="sqlite://", CORS_ORIGINS=[], CORS_ORIGIN_REGEX="").CORS_ORIGIN_REGEX
        is None
    )
