from fastapi import APIRouter

from app.auth import CurrentUserId
from app.db import SessionDep
from app.schemas.expense import ExpenseCreate, ExpenseRead, LastPaymentMethod
from app.services import expense_service

router = APIRouter()


@router.post("/expenses", status_code=201)
def create_expense(data: ExpenseCreate, user_id: CurrentUserId, session: SessionDep) -> ExpenseRead:
    expense = expense_service.create_expense(session, user_id, data)
    return ExpenseRead.model_validate(expense, from_attributes=True)


# Ruta fija: tiene que quedar antes de cualquier /expenses/{id} futuro (Fase 6).
@router.get("/expenses/last-payment-method")
def read_last_payment_method(user_id: CurrentUserId, session: SessionDep) -> LastPaymentMethod:
    return LastPaymentMethod.model_validate(
        {"payment_method": expense_service.last_payment_method(session, user_id)}
    )
