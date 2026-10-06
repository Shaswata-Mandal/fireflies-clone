from fastapi.testclient import TestClient

ALLOWED_ORIGIN = "http://testserver"


def test_cors_exposes_content_disposition(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": ALLOWED_ORIGIN})

    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    exposed = response.headers["access-control-expose-headers"].lower()
    assert "content-disposition" in exposed
