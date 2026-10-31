from collections.abc import Sequence
from uuid import UUID

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.category import Category
from app.repositories import category_repo

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
