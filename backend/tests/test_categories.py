import threading
import time
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.category import Category
from app.services.category_service import list_categories
from tests.conftest import USER_A, USER_B, auth, make_token

EXPECTED_COLORS = {
    "Comida": 1,
    "Deporte": 5,
    "Ropa": 3,
    "Salidas": 7,
    "Suscripciones": 2,
    "Transporte": 6,
    "Otros": 10,
}


@pytest.fixture(autouse=True)
def _clean(db_session: Session) -> None:
    """db_session hace TRUNCATE al final: asi ningun test de este archivo deja filas."""


def count_categories(db_session: Session) -> int | None:
    return db_session.scalar(select(func.count()).select_from(Category))


def test_seed_first_get(client: TestClient, db_session: Session) -> None:
    r = client.get("/categories", headers=auth(make_token(USER_A)))
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 7
    assert {c["name"]: c["color"] for c in body} == EXPECTED_COLORS
    assert [c["name"] for c in body if c["is_fallback"]] == ["Otros"]
    assert all(c["emoji"] for c in body)


def test_seed_idempotent(client: TestClient, db_session: Session) -> None:
    headers = auth(make_token(USER_A))
    assert client.get("/categories", headers=headers).status_code == 200
    assert client.get("/categories", headers=headers).status_code == 200
    assert count_categories(db_session) == 7


def test_seed_concurrent(db_session: Session) -> None:
    s1, s2 = SessionLocal(), SessionLocal()
    errors: list[Exception] = []

    def second() -> None:
        try:
            list_categories(s2, UUID(USER_A))  # bloquea hasta el commit de s1
            s2.commit()
        except Exception as e:
            errors.append(e)

    try:
        list_categories(s1, UUID(USER_A))  # insertado, sin commit
        t = threading.Thread(target=second)
        t.start()
        time.sleep(0.3)
        s1.commit()
        t.join(5)
        assert not t.is_alive()
    finally:
        s1.close()
        s2.close()
    assert errors == []
    assert count_categories(db_session) == 7


def test_seed_per_user(client: TestClient, db_session: Session) -> None:
    a = client.get("/categories", headers=auth(make_token(USER_A))).json()
    b = client.get("/categories", headers=auth(make_token(USER_B))).json()
    assert count_categories(db_session) == 14
    assert len(a) == 7 and len(b) == 7
    assert not {c["id"] for c in a} & {c["id"] for c in b}


def test_categories_requires_auth(client: TestClient) -> None:
    assert client.get("/categories").status_code == 401


VALID = {"name": "Farmacia", "emoji": "💊", "color": 4}
DUP = {"detail": "Ya tenés una categoría con ese nombre"}


def cat_id(client: TestClient, user: str, name: str) -> str:
    cats = client.get("/categories", headers=auth(make_token(user))).json()
    return str(next(c["id"] for c in cats if c["name"] == name))


def test_create_category(client: TestClient) -> None:
    headers = auth(make_token(USER_A))
    r = client.post("/categories", headers=headers, json=VALID)
    assert r.status_code == 201
    body = r.json()
    assert body["id"] and body["name"] == "Farmacia" and body["is_fallback"] is False
    assert len(client.get("/categories", headers=headers).json()) == 8


def test_create_seeds_first(client: TestClient, db_session: Session) -> None:
    r = client.post("/categories", headers=auth(make_token(USER_A)), json=VALID)
    assert r.status_code == 201
    assert count_categories(db_session) == 8


@pytest.mark.parametrize("name", ["  comida ", "COMIDA"])
def test_create_duplicate(client: TestClient, name: str) -> None:
    r = client.post("/categories", headers=auth(make_token(USER_A)), json={**VALID, "name": name})
    assert r.status_code == 409
    assert r.json() == DUP


def test_create_duplicate_accents(client: TestClient) -> None:
    headers = auth(make_token(USER_A))
    r = client.post("/categories", headers=headers, json={**VALID, "name": "ÑANDÚ"})
    assert r.status_code == 201
    r = client.post("/categories", headers=headers, json={**VALID, "name": "ñandú"})
    assert r.status_code == 409
    assert r.json() == DUP


def test_create_same_name_other_user(client: TestClient) -> None:
    assert (
        client.post("/categories", headers=auth(make_token(USER_A)), json=VALID).status_code == 201
    )
    assert (
        client.post("/categories", headers=auth(make_token(USER_B)), json=VALID).status_code == 201
    )


@pytest.mark.parametrize(
    "patch",
    [
        {"emoji": "ab"},
        {"emoji": "🍔🍕"},
        {"emoji": ""},
        {"emoji": "a"},
        {"color": 0},
        {"color": 11},
        {"color": "3"},
        {"name": ""},
        {"name": "   "},
        {"name": "x" * 41},
        {"is_fallback": True},
        {"user_id": USER_B},
    ],
)
def test_create_invalid(client: TestClient, patch: dict[str, object]) -> None:
    r = client.post("/categories", headers=auth(make_token(USER_A)), json={**VALID, **patch})
    assert r.status_code == 422


@pytest.mark.parametrize("emoji", ["👨‍👩‍👧", "✈️", "🏋️"])
def test_create_valid_emoji(client: TestClient, emoji: str) -> None:
    r = client.post("/categories", headers=auth(make_token(USER_A)), json={**VALID, "emoji": emoji})
    assert r.status_code == 201
    assert r.json()["emoji"] == emoji


def test_rename_category(client: TestClient) -> None:
    cid = cat_id(client, USER_A, "Comida")
    body = {"name": "Almuerzos", "emoji": "🥪", "color": 2}
    r = client.put(f"/categories/{cid}", headers=auth(make_token(USER_A)), json=body)
    assert r.status_code == 200
    assert r.json() == {"id": cid, **body, "is_fallback": False}


def test_rename_same_name_other_case(client: TestClient) -> None:
    cid = cat_id(client, USER_A, "Comida")
    body = {"name": "comida", "emoji": "🍔", "color": 1}
    r = client.put(f"/categories/{cid}", headers=auth(make_token(USER_A)), json=body)
    assert r.status_code == 200
    assert r.json()["name"] == "comida"


def test_rename_to_existing(client: TestClient) -> None:
    cid = cat_id(client, USER_A, "Comida")
    body = {"name": "Ropa", "emoji": "🍔", "color": 1}
    r = client.put(f"/categories/{cid}", headers=auth(make_token(USER_A)), json=body)
    assert r.status_code == 409
    assert r.json() == DUP


def test_rename_fallback_keeps_flag(client: TestClient) -> None:
    cid = cat_id(client, USER_A, "Otros")
    body = {"name": "Varios", "emoji": "📦", "color": 10}
    r = client.put(f"/categories/{cid}", headers=auth(make_token(USER_A)), json=body)
    assert r.status_code == 200
    assert r.json()["name"] == "Varios"
    assert r.json()["is_fallback"] is True


def test_rename_other_user(client: TestClient) -> None:
    cid = cat_id(client, USER_A, "Comida")
    headers_b = auth(make_token(USER_B))
    r = client.put(f"/categories/{cid}", headers=headers_b, json=VALID)
    assert r.status_code == 404
    assert r.json() == {"detail": "Not found"}
    assert client.put(f"/categories/{uuid4()}", headers=headers_b, json=VALID).status_code == 404


def test_category_writes_require_auth(client: TestClient) -> None:
    assert client.post("/categories", json=VALID).status_code == 401
    assert client.put(f"/categories/{uuid4()}", json=VALID).status_code == 401
