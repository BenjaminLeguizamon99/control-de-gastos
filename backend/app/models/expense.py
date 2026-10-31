# "import datetime as dt": un campo llamado `date` taparia el tipo date.
import datetime as dt
from uuid import UUID

from sqlalchemy import BigInteger, DateTime, ForeignKey, SmallInteger, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    user_id: Mapped[UUID]
    category_id: Mapped[UUID] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"))
    amount_cents: Mapped[int] = mapped_column(BigInteger)
    description: Mapped[str | None]
    payment_method: Mapped[str]
    date: Mapped[dt.date]
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    installments: Mapped[list["Installment"]] = relationship(cascade="all, delete-orphan")


class Installment(Base):
    __tablename__ = "installments"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    expense_id: Mapped[UUID] = mapped_column(ForeignKey("expenses.id", ondelete="CASCADE"))
    user_id: Mapped[UUID]
    number: Mapped[int] = mapped_column(SmallInteger)
    period: Mapped[dt.date]
    amount_cents: Mapped[int] = mapped_column(BigInteger)
