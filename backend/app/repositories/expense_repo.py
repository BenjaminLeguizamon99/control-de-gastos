from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.expense import Expense


def get(session: Session, user_id: UUID, expense_id: UUID) -> Expense | None:
    return session.scalar(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user_id)
    )


def last_payment_method(session: Session, user_id: UUID) -> str | None:
    return session.scalar(
        select(Expense.payment_method)
        .where(Expense.user_id == user_id)
        .order_by(Expense.created_at.desc(), Expense.id.desc())
        .limit(1)
    )
