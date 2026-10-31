from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, SmallInteger, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[UUID]
    name: Mapped[str]
    emoji: Mapped[str]
    color: Mapped[int] = mapped_column(SmallInteger)
    is_fallback: Mapped[bool] = mapped_column(server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
