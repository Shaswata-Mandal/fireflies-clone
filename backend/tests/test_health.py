from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.core.database import get_db


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_db_runs_a_query(client: TestClient) -> None:
    response = client.get("/health/db")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_db_returns_503_when_the_database_is_down(api: TestClient) -> None:
    class BrokenSession:
        def execute(self, *_args: object) -> None:
            raise OperationalError("SELECT 1", {}, Exception("unable to open database file"))

        def close(self) -> None:
            pass

    api.app.dependency_overrides[get_db] = lambda: BrokenSession()

    response = api.get("/health/db")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "DB_UNAVAILABLE"
