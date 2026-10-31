import pytest
from fastapi.testclient import TestClient


@pytest.mark.parametrize("method", ["POST", "PUT"])
def test_cors_preflight_write(client: TestClient, method: str) -> None:
    r = client.options(
        "/categories",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": method},
    )
    assert r.status_code == 200
    assert method in r.headers["access-control-allow-methods"]
