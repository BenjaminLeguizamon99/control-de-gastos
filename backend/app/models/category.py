from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, Index, SmallInteger, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Category(Base):
    __tablename__ = "categories"
    # Espejo de la migracion 0002: sin esto, autogenerate propone borrar los indices.
    __table_args__ = (
        CheckConstraint("color BETWEEN 1 AND 10", name="ck_categories_color"),
        CheckConstraint("char_length(name) BETWEEN 1 AND 40", name="ck_categories_name_len"),
        Index(
            "uq_categories_user_name",
            "user_id",
            text("lower(btrim(name) COLLATE pg_c_utf8)"),
            unique=True,
        ),
        Index(
            "uq_categories_user_fallback",
            "user_id",
            unique=True,
            postgresql_where=text("is_fallback"),
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[UUID]
    name: Mapped[str] = mapped_column(Text)
    emoji: Mapped[str] = mapped_column(Text)
    color: Mapped[int] = mapped_column(SmallInteger)
    is_fallback: Mapped[bool] = mapped_column(server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
