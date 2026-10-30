from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

# Pool chico: el pooler de Supabase free tiene pocas conexiones.
engine = create_engine(
    get_settings().database_url,
    pool_size=5,
    max_overflow=0,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    with SessionLocal() as session, session.begin():
        yield session


# scope="function": el commit corre antes de mandar la respuesta, asi un commit
# fallido devuelve 5xx en vez de un 2xx con el dato perdido.
SessionDep = Annotated[Session, Depends(get_session, scope="function")]
