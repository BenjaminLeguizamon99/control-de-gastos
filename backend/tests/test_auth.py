import time

import jwt
from fastapi.testclient import TestClient

from tests.conftest import OTHER_KEY, OUTSIDER, USER_A, auth, make_token


def assert_401(client: TestClient, token: str) -> None:
    r = client.get("/me", headers=auth(token))
    assert r.status_code == 401
    assert r.headers["WWW-Authenticate"] == "Bearer"


def base_claims() -> dict[str, object]:
    return {
        "sub": USER_A,
        "aud": "authenticated",
        "iss": "https://test.supabase.co/auth/v1",
        "exp": int(time.time()) + 3600,
    }


def test_no_header_401(client: TestClient) -> None:
    r = client.get("/me")
    assert r.status_code == 401
    assert r.headers["WWW-Authenticate"] == "Bearer"


def test_expired_401(client: TestClient) -> None:
    assert_401(client, make_token(USER_A, exp=int(time.time()) - 60))


def test_wrong_audience_401(client: TestClient) -> None:
    assert_401(client, make_token(USER_A, aud="anon"))


def test_wrong_issuer_401(client: TestClient) -> None:
    assert_401(client, make_token(USER_A, iss="https://otro.supabase.co/auth/v1"))


def test_hs256_401(client: TestClient) -> None:
    assert_401(
        client, jwt.encode(base_claims(), "s" * 32, algorithm="HS256", headers={"kid": "test"})
    )


def test_alg_none_401(client: TestClient) -> None:
    assert_401(client, jwt.encode(base_claims(), None, algorithm="none"))  # type: ignore[arg-type]


def test_other_key_401(client: TestClient) -> None:
    assert_401(client, make_token(USER_A, key=OTHER_KEY))


def test_sub_not_uuid_401(client: TestClient) -> None:
    assert_401(client, make_token("no-uuid"))


def test_garbage_token_401(client: TestClient) -> None:
    assert_401(client, "not.a.jwt")


def test_outsider_403(client: TestClient) -> None:
    r = client.get("/me", headers=auth(make_token(OUTSIDER)))
    assert r.status_code == 403


def test_valid_returns_user_id(client: TestClient) -> None:
    r = client.get("/me", headers=auth(make_token(USER_A)))
    assert r.status_code == 200
    assert r.json() == {"user_id": USER_A}
