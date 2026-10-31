import threading
import time
from uuid import UUID

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
