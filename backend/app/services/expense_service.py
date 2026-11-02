from uuid import UUID

from fastapi import HTTPException
from psycopg.errors import UniqueViolation
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.expense import Expense, Installment
from app.repositories import category_repo, expense_repo
from app.schemas.expense import ExpenseCreate


def create_expense(session: Session, user_id: UUID, data: ExpenseCreate) -> Expense:
    existing = expense_repo.get(session, user_id, data.id)
    if existing is not None:
        return _same_or_409(existing, data)
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
    try:
        # Savepoint: si otro request con el mismo id gano la carrera, se descarta solo este insert.
        with session.begin_nested():
            session.add(expense)
    except IntegrityError as e:
        if not (
            isinstance(e.orig, UniqueViolation) and e.orig.diag.constraint_name == "expenses_pkey"
        ):
            raise
        existing = expense_repo.get(session, user_id, data.id)
        if existing is None:  # el id es de otro usuario
            raise HTTPException(409, "Conflicting id") from None
        return _same_or_409(existing, data)
    return expense


def _same_or_409(existing: Expense, data: ExpenseCreate) -> Expense:
    # Reintento del mismo borrador: no duplica. Si el cliente cambio los datos (la respuesta
    # anterior se perdio y el usuario corrigio el form), devolver el viejo pisaria la correccion.
    saved = (
        existing.amount_cents,
        existing.category_id,
        existing.description,
        existing.payment_method,
        existing.date,
    )
    sent = (
        data.amount_cents,
        data.category_id,
        data.description or None,
        data.payment_method,
        data.date,
    )
    if saved != sent:
        raise HTTPException(409, "Conflicting retry")
    return existing


def last_payment_method(session: Session, user_id: UUID) -> str:
    return expense_repo.last_payment_method(session, user_id) or "debit"  # D-19
