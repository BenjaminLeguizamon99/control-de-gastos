from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category


def get(session: Session, user_id: UUID, category_id: UUID) -> Category | None:
    return session.scalar(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )


def list_for_user(session: Session, user_id: UUID) -> Sequence[Category]:
    # Sin ORDER BY: el cliente ordena con localeCompare (D-08).
    return session.scalars(select(Category).where(Category.user_id == user_id)).all()
