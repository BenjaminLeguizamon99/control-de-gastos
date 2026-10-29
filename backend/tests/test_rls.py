from sqlalchemy import text
from sqlalchemy.orm import Session


def test_all_public_tables_have_rls(db_session: Session) -> None:
    rows = (
        db_session.execute(
            text(
                "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
                "WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity"
            )
        )
        .scalars()
        .all()
    )
    assert rows == []


def test_alembic_version_in_public(db_session: Session) -> None:
    exists = db_session.scalar(text("SELECT to_regclass('public.alembic_version') IS NOT NULL"))
    assert exists is True
