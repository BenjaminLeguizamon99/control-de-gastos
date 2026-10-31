from fastapi import APIRouter

from app.auth import CurrentUserId
from app.db import SessionDep
from app.schemas.category import CategoryRead
from app.services.category_service import list_categories

router = APIRouter()


@router.get("/categories")
def read_categories(user_id: CurrentUserId, session: SessionDep) -> list[CategoryRead]:
    return [
        CategoryRead.model_validate(c, from_attributes=True)
        for c in list_categories(session, user_id)
    ]
