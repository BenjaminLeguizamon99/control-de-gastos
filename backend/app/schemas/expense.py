# "import datetime as dt": un campo llamado `date` taparia el tipo date.
import datetime as dt
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


class ExpenseCreate(BaseModel):
    # extra=forbid bloquea un user_id contrabandeado. Strict va por campo: un modelo strict
    # rechazaria el UUID y la fecha que en el JSON llegan como string.
    model_config = ConfigDict(extra="forbid")

    id: UUID  # lo genera el cliente: reintentar el mismo borrador no duplica
    amount_cents: int = Field(strict=True, gt=0, le=100_000_000_000)
    category_id: UUID
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=140)] | None = (
        None
    )
    payment_method: Literal["debit", "cash"]  # D-20: la Fase 4 suma "credit"
    date: dt.date


class ExpenseRead(BaseModel):
    id: UUID
    category_id: UUID
    amount_cents: int
    description: str | None
    payment_method: str
    date: dt.date


class LastPaymentMethod(BaseModel):
    payment_method: Literal["debit", "credit", "cash"]
