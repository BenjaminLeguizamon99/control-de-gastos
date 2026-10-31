from uuid import UUID

from fastapi import APIRouter

from app.auth import CurrentUserId
from app.db import SessionDep
from app.schemas.category import CategoryIn, CategoryRead
from app.services.category_service import create_category, list_categories, update_category

router = APIRouter()


@router.get("/categories")
def read_categories(user_id: CurrentUserId, session: SessionDep) -> list[CategoryRead]:
    return [
        CategoryRead.model_validate(c, from_attributes=True)
        for c in list_categories(session, user_id)
    ]


@router.post("/categories", status_code=201)
def post_category(user_id: CurrentUserId, session: SessionDep, data: CategoryIn) -> CategoryRead:
    return CategoryRead.model_validate(
        create_category(session, user_id, data), from_attributes=True
    )


@router.put("/categories/{category_id}")
def put_category(
    category_id: UUID, user_id: CurrentUserId, session: SessionDep, data: CategoryIn
) -> CategoryRead:
    return CategoryRead.model_validate(
        update_category(session, user_id, category_id, data), from_attributes=True
    )
