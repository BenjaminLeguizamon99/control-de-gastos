from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.expense import Expense, Installment
from app.repositories import category_repo, expense_repo
from app.schemas.expense import ExpenseCreate


def create_expense(session: Session, user_id: UUID, data: ExpenseCreate) -> Expense:
    existing = expense_repo.get(session, user_id, data.id)
    if existing is not None:
        return existing  # reintento del mismo borrador: no duplica
    if category_repo.get(session, user_id, data.category_id) is None:
        # shortcut: HTTPException desde el service; pasar a excepciones de dominio si aparece
        # un caller no HTTP. 404 y no 403: no revela si la categoria es de otro.
        raise HTTPException(404, "Not found")
    expense = Expense(
        id=data.id,
        user_id=user_id,
        category_id=data.category_id,
        amount_cents=data.amount_cents,
        description=data.description or None,
        payment_method=data.payment_method,
        date=data.date,
        # D-21: la cuota va al mes de la fecha elegida, nunca al de hoy.
        installments=[
            Installment(
                user_id=user_id,
                number=1,
                period=data.date.replace(day=1),
                amount_cents=data.amount_cents,
            )
        ],
    )
    session.add(expense)
    session.flush()
    return expense


def last_payment_method(session: Session, user_id: UUID) -> str:
    return expense_repo.last_payment_method(session, user_id) or "debit"  # D-19
