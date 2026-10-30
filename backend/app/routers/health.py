from fastapi import APIRouter
from sqlalchemy import text

from app.db import SessionDep

router = APIRouter()


@router.get("/health")
def health(session: SessionDep) -> dict[str, str]:
    session.execute(text("SELECT 1"))
    return {"status": "ok"}
