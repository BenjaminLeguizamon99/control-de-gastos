"""categories, expenses, installments + RLS

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid, nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("emoji", sa.Text, nullable=False),
        sa.Column("color", sa.SmallInteger, nullable=False),
        sa.Column("is_fallback", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("color BETWEEN 1 AND 10", name="ck_categories_color"),
        sa.CheckConstraint("char_length(name) BETWEEN 1 AND 40", name="ck_categories_name_len"),
    )
    # pg_c_utf8 (PG17 builtin): lower() Unicode igual en todo SO; con "C", lower('Ñ') = 'Ñ'.
    op.execute(
        "CREATE UNIQUE INDEX uq_categories_user_name ON categories "
        "(user_id, lower(btrim(name) COLLATE pg_c_utf8))"
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_categories_user_fallback ON categories (user_id) WHERE is_fallback"
    )

    op.create_table(
        "expenses",
        sa.Column("id", sa.Uuid, primary_key=True),  # lo genera el cliente (reintentos)
        sa.Column("user_id", sa.Uuid, nullable=False),
        sa.Column(
            "category_id",
            sa.Uuid,
            sa.ForeignKey("categories.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("amount_cents", sa.BigInteger, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("payment_method", sa.Text, nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("amount_cents > 0", name="ck_expenses_amount"),
        sa.CheckConstraint(
            "payment_method IN ('debit', 'credit', 'cash')", name="ck_expenses_method"
        ),
        sa.CheckConstraint("char_length(description) <= 140", name="ck_expenses_desc_len"),
    )
    op.create_index("ix_expenses_user_created", "expenses", ["user_id", sa.text("created_at DESC")])

    op.create_table(
        "installments",
        sa.Column("id", sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "expense_id",
            sa.Uuid,
            sa.ForeignKey("expenses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid, nullable=False),
        sa.Column("number", sa.SmallInteger, nullable=False),
        sa.Column("period", sa.Date, nullable=False),
        sa.Column("amount_cents", sa.BigInteger, nullable=False),
        sa.UniqueConstraint("expense_id", "number", name="uq_installments_expense_number"),
        sa.CheckConstraint("number >= 1", name="ck_installments_number"),
        sa.CheckConstraint("extract(day from period) = 1", name="ck_installments_period_day1"),
        sa.CheckConstraint("amount_cents > 0", name="ck_installments_amount"),
    )
    op.create_index("ix_installments_user_period", "installments", ["user_id", "period"])

    # RLS sin policies: la Data API de Supabase no puede leer nada.
    for table in ("categories", "expenses", "installments"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_table("installments")
    op.drop_table("expenses")
    op.drop_table("categories")
