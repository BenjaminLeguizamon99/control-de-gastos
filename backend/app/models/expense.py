# "import datetime as dt": un campo llamado `date` taparia el tipo date.
import datetime as dt
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Expense(Base):
    __tablename__ = "expenses"
    # Espejo de la migracion 0002: sin esto, autogenerate propone borrar los indices.
    __table_args__ = (
        CheckConstraint("amount_cents > 0", name="ck_expenses_amount"),
        CheckConstraint("payment_method IN ('debit', 'credit', 'cash')", name="ck_expenses_method"),
        CheckConstraint("char_length(description) <= 140", name="ck_expenses_desc_len"),
        Index("ix_expenses_user_created", "user_id", text("created_at DESC")),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    user_id: Mapped[UUID]
    category_id: Mapped[UUID] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"))
    amount_cents: Mapped[int] = mapped_column(BigInteger)
    description: Mapped[str | None] = mapped_column(Text)
    payment_method: Mapped[str] = mapped_column(Text)
    date: Mapped[dt.date]
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    installments: Mapped[list["Installment"]] = relationship(cascade="all, delete-orphan")


class Installment(Base):
    __tablename__ = "installments"
    __table_args__ = (
        UniqueConstraint("expense_id", "number", name="uq_installments_expense_number"),
        CheckConstraint("number >= 1", name="ck_installments_number"),
        CheckConstraint("extract(day from period) = 1", name="ck_installments_period_day1"),
        CheckConstraint("amount_cents > 0", name="ck_installments_amount"),
        Index("ix_installments_user_period", "user_id", "period"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    expense_id: Mapped[UUID] = mapped_column(ForeignKey("expenses.id", ondelete="CASCADE"))
    user_id: Mapped[UUID]
    number: Mapped[int] = mapped_column(SmallInteger)
    period: Mapped[dt.date]
    amount_cents: Mapped[int] = mapped_column(BigInteger)
