import os

# Must run before `app` is imported: settings are read once at import time. Tests use an in-memory
# DB and never depend on (or touch) a developer's local .env database.
os.environ.setdefault("ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("CORS_ORIGINS", '["http://testserver"]')

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())
