import os
from urllib.parse import urlparse

# Las env vars le ganan al .env real: tienen que estar antes de cualquier import de app.
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5433/test"
)
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["ALLOWED_USER_IDS"] = (
    '["11111111-1111-1111-1111-111111111111","22222222-2222-2222-2222-222222222222"]'
)
os.environ["CORS_ORIGINS"] = '["http://localhost:5173"]'

# Los fixtures hacen TRUNCATE: nunca correr contra Supabase.
assert urlparse(os.environ["DATABASE_URL"]).hostname in ("localhost", "127.0.0.1"), (
    "Los tests solo corren contra la DB local de Docker"
)

import time  # noqa: E402
from collections.abc import Iterator  # noqa: E402
from typing import Any  # noqa: E402

import jwt  # noqa: E402
import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import ec  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.auth import get_jwks_client  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402

USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"
OUTSIDER = "33333333-3333-3333-3333-333333333333"
KEY = ec.generate_private_key(ec.SECP256R1())
OTHER_KEY = ec.generate_private_key(ec.SECP256R1())


class FakeJWKS:
    """Reemplaza la descarga del JWKS; la verificacion real de jwt.decode sigue corriendo."""

    def get_signing_key_from_jwt(self, token: str) -> jwt.PyJWK:
        jwk = jwt.algorithms.ECAlgorithm.to_jwk(KEY.public_key(), as_dict=True)
        return jwt.PyJWK({**jwk, "kid": "test", "alg": "ES256"})


def make_token(sub: str, *, key: Any = KEY, algorithm: str = "ES256", **overrides: Any) -> str:
    claims = {
        "sub": sub,
        "aud": "authenticated",
        "iss": "https://test.supabase.co/auth/v1",
        "exp": int(time.time()) + 3600,
        "role": "authenticated",
        **overrides,
    }
    return jwt.encode(claims, key, algorithm=algorithm, headers={"kid": "test"})


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session", autouse=True)
def _migrate() -> None:
    # Alembic real contra Docker: tambien prueba la migracion.
    command.upgrade(Config("alembic.ini"), "head")


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides[get_jwks_client] = FakeJWKS
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def db_session() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.execute(text("TRUNCATE probes, installments, expenses, categories"))
        session.commit()
        session.close()
