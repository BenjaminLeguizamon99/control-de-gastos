from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy.orm import Session

from app.models import Base


def test_models_match_migrations(db_session: Session) -> None:
    # Si los modelos se desfasan, el proximo autogenerate propone borrar indices o cambiar tipos.
    context = MigrationContext.configure(db_session.connection(), opts={"compare_type": True})
    assert compare_metadata(context, Base.metadata) == []
