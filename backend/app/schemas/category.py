from typing import Annotated
from uuid import UUID

import emoji as emoji_lib
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


def _one_emoji(v: str) -> str:
    if not emoji_lib.is_emoji(v):
        raise ValueError("Tiene que ser un solo emoji")
    return v


class CategoryIn(BaseModel):
    """Body de POST y PUT: el sheet manda siempre los 3 campos (D-14)."""

    model_config = ConfigDict(strict=True, extra="forbid")

    name: Name
    emoji: Annotated[str, AfterValidator(_one_emoji)]
    color: int = Field(ge=1, le=10)


class CategoryRead(BaseModel):
    id: UUID
    name: str
    emoji: str
    color: int
    is_fallback: bool
