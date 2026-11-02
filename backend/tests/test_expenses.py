import datetime as dt
import uuid
from typing import Any
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.expense import Expense, Installment
from app.repositories import expense_repo
from tests.conftest import USER_A, USER_B, auth, make_token


def first_category(client: TestClient, user: str) -> str:
    r = client.get("/categories", headers=auth(make_token(user)))
    assert r.status_code == 200
    return str(r.json()[0]["id"])


def expense_body(category_id: str, **overrides: Any) -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "amount_cents": 123456,
        "category_id": category_id,
        "description": "Almuerzo",
        "payment_method": "debit",
        "date": "2026-10-31",
        **overrides,
    }


def post_expense(client: TestClient, user: str, body: dict[str, Any]) -> Any:
    return client.post("/expenses", json=body, headers=auth(make_token(user)))


def count(db_session: Session, model: Any) -> int | None:
    return db_session.scalar(select(func.count()).select_from(model))


def test_expense_cents(client: TestClient, db_session: Session) -> None:
    body = expense_body(first_category(client, USER_A))
    r = post_expense(client, USER_A, body)
    assert r.status_code == 201
    assert r.json()["amount_cents"] == 123456
    assert type(r.json()["amount_cents"]) is int
    expense = db_session.scalar(select(Expense))
    assert expense is not None and expense.amount_cents == 123456
    installments = db_session.scalars(select(Installment)).all()
    assert len(installments) == 1
    assert installments[0].number == 1
    assert installments[0].amount_cents == 123456
    assert installments[0].expense_id == UUID(body["id"])


@pytest.mark.parametrize(
    ("date", "period"),
    [
        ("2026-10-31", dt.date(2026, 10, 1)),
        ("2026-12-31", dt.date(2026, 12, 1)),
        ("2027-01-01", dt.date(2027, 1, 1)),
    ],
)
def test_expense_period(
    client: TestClient, db_session: Session, date: str, period: dt.date
) -> None:
    r = post_expense(client, USER_A, expense_body(first_category(client, USER_A), date=date))
    assert r.status_code == 201
    assert r.json()["date"] == date
    assert db_session.scalar(select(Installment.period)) == period


def test_expense_other_user_category(client: TestClient, db_session: Session) -> None:
    r = post_expense(client, USER_B, expense_body(first_category(client, USER_A)))
    assert r.status_code == 404
    assert r.json() == {"detail": "Not found"}
    assert count(db_session, Expense) == 0


@pytest.mark.parametrize(
    "overrides",
    [
        {"amount_cents": 0},
        {"amount_cents": -1},
        {"amount_cents": 12.5},
        {"amount_cents": "123456"},
        {"amount_cents": True},
        {"payment_method": "credit"},
        {"payment_method": "tarjeta"},
        {"user_id": USER_A},
        {"description": "x" * 141},
        {"date": "31/10/2026"},
    ],
)
def test_expense_invalid(
    client: TestClient, db_session: Session, overrides: dict[str, Any]
) -> None:
    r = post_expense(client, USER_A, expense_body(first_category(client, USER_A), **overrides))
    assert r.status_code == 422
    assert count(db_session, Expense) == 0


@pytest.mark.parametrize("description", [None, "   "])
def test_expense_description_optional(
    client: TestClient, db_session: Session, description: str | None
) -> None:
    body = expense_body(first_category(client, USER_A), description=description)
    if description is None:
        del body["description"]
    r = post_expense(client, USER_A, body)
    assert r.status_code == 201
    assert r.json()["description"] is None


def test_expense_idempotent(client: TestClient, db_session: Session) -> None:
    body = expense_body(first_category(client, USER_A))
    assert post_expense(client, USER_A, body).status_code == 201
    assert post_expense(client, USER_A, body).status_code == 201
    assert count(db_session, Expense) == 1
    assert count(db_session, Installment) == 1


@pytest.mark.parametrize(
    "overrides",
    [
        {"amount_cents": 999},
        {"description": "Cena"},
        {"payment_method": "cash"},
        {"date": "2026-10-30"},
    ],
)
def test_expense_retry_with_changes_conflicts(
    client: TestClient, db_session: Session, overrides: dict[str, Any]
) -> None:
    body = expense_body(first_category(client, USER_A))
    assert post_expense(client, USER_A, body).status_code == 201
    r = post_expense(client, USER_A, {**body, **overrides})
    assert r.status_code == 409
    assert db_session.scalar(select(Expense.amount_cents)) == 123456
    assert count(db_session, Expense) == 1


def test_expense_id_of_other_user_conflicts(client: TestClient, db_session: Session) -> None:
    body = expense_body(first_category(client, USER_A))
    assert post_expense(client, USER_A, body).status_code == 201
    r = post_expense(client, USER_B, {**body, "category_id": first_category(client, USER_B)})
    assert r.status_code == 409
    assert count(db_session, Expense) == 1


def test_expense_concurrent_retry(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Simula la carrera: el otro request inserto despues de que este hizo el SELECT.
    body = expense_body(first_category(client, USER_A))
    assert post_expense(client, USER_A, body).status_code == 201
    real_get = expense_repo.get
    calls: list[None] = []

    def stale_first_get(*args: Any) -> Expense | None:
        calls.append(None)
        return None if len(calls) == 1 else real_get(*args)

    monkeypatch.setattr(expense_repo, "get", stale_first_get)
    r = post_expense(client, USER_A, body)
    assert r.status_code == 201
    assert r.json()["id"] == body["id"]
    assert len(calls) == 2
    assert count(db_session, Expense) == 1


def last_payment(client: TestClient, user: str) -> Any:
    r = client.get("/expenses/last-payment-method", headers=auth(make_token(user)))
    assert r.status_code == 200
    return r.json()


def test_last_payment_method(client: TestClient, db_session: Session) -> None:
    assert last_payment(client, USER_A) == {"payment_method": "debit"}

    cat_a = first_category(client, USER_A)
    r = post_expense(client, USER_A, expense_body(cat_a, payment_method="cash"))
    assert r.status_code == 201
    assert last_payment(client, USER_A) == {"payment_method": "cash"}


def test_last_payment_method_newest_wins(client: TestClient, db_session: Session) -> None:
    cat_a = UUID(first_category(client, USER_A))
    cat_b = UUID(first_category(client, USER_B))
    now = dt.datetime.now(dt.UTC)

    def add(user: str, category: UUID, method: str, created_at: dt.datetime) -> None:
        db_session.add(
            Expense(
                id=uuid.uuid4(),
                user_id=UUID(user),
                category_id=category,
                amount_cents=100,
                payment_method=method,
                date=dt.date(2026, 10, 31),
                created_at=created_at,
            )
        )

    add(USER_A, cat_a, "debit", now - dt.timedelta(minutes=1))
    add(USER_A, cat_a, "credit", now)
    add(USER_B, cat_b, "cash", now + dt.timedelta(minutes=1))
    db_session.commit()
    assert last_payment(client, USER_A) == {"payment_method": "credit"}
    assert last_payment(client, USER_B) == {"payment_method": "cash"}


def test_expenses_require_auth(client: TestClient) -> None:
    assert client.post("/expenses", json={}).status_code == 401
    assert client.get("/expenses/last-payment-method").status_code == 401
