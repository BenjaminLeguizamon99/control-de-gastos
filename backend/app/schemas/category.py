from uuid import UUID

from pydantic import BaseModel


class CategoryRead(BaseModel):
    id: UUID
    name: str
    emoji: str
    color: int
    is_fallback: bool
