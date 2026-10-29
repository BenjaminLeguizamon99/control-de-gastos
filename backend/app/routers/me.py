from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel

from app.auth import CurrentUserId

router = APIRouter()


class MeResponse(BaseModel):
    user_id: UUID


@router.get("/me")
def me(user_id: CurrentUserId) -> MeResponse:
    return MeResponse(user_id=user_id)
