from collections.abc import Sequence
from uuid import UUID

from fastapi import HTTPException
from psycopg.errors import UniqueViolation
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.category import Category
from app.repositories import category_repo
from app.schemas.category import CategoryIn

# (nombre, emoji, color, is_fallback). Colores de 03-UI-SPEC (D-09).
BASE: list[tuple[str, str, int, bool]] = [
    ("Comida", "🍔", 1, False),
    ("Deporte", "⚽", 5, False),
    ("Ropa", "👕", 3, False),
    ("Salidas", "🎉", 7, False),
    ("Suscripciones", "📺", 2, False),
    ("Transporte", "🚌", 6, False),
    ("Otros", "📦", 10, True),
]


def ensure_seeded(session: Session, user_id: UUID) -> None:
    if category_repo.list_for_user(session, user_id):
        return
    # Sin conflict target: cubre los indices unicos funcionales si otra request sembro a la vez.
    session.execute(
        pg_insert(Category)
        .values(
            [
                {"user_id": user_id, "name": n, "emoji": e, "color": c, "is_fallback": f}
                for n, e, c, f in BASE
            ]
        )
        .on_conflict_do_nothing()
    )


def list_categories(session: Session, user_id: UUID) -> Sequence[Category]:
    ensure_seeded(session, user_id)
    # READ COMMITTED: este SELECT nuevo ve lo que commiteo la otra transaccion.
    return category_repo.list_for_user(session, user_id)


def _flush_or_409(session: Session) -> None:
    # Flush aca y no en el commit del request: si no, el duplicado sale como 500 (D-15).
    try:
        session.flush()
    except IntegrityError as e:
        if (
            isinstance(e.orig, UniqueViolation)
            and e.orig.diag.constraint_name == "uq_categories_user_name"
        ):
            raise HTTPException(409, "Ya tenés una categoría con ese nombre") from None
        raise


def create_category(session: Session, user_id: UUID, data: CategoryIn) -> Category:
    ensure_seeded(session, user_id)  # un POST antes del primer GET no deja al usuario sin base
    category = Category(user_id=user_id, name=data.name, emoji=data.emoji, color=data.color)
    session.add(category)
    _flush_or_409(session)
    return category


def update_category(
    session: Session, user_id: UUID, category_id: UUID, data: CategoryIn
) -> Category:
    category = category_repo.get(session, user_id, category_id)
    if category is None:
        raise HTTPException(404, "Not found")
    category.name = data.name
    category.emoji = data.emoji
    category.color = data.color
    _flush_or_409(session)
    return category
