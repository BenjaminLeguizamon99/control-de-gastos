from functools import lru_cache
from uuid import UUID

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    supabase_url: str
    allowed_user_ids: list[UUID]  # JSON en el entorno: ["..."]
    cors_origins: list[str] = ["http://localhost:5173"]

    @field_validator("supabase_url")
    @classmethod
    def _strip_slash(cls, v: str) -> str:
        # Una barra final rompe el issuer ("...co//auth/v1") y todos los tokens darian 401
        return v.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # los valores vienen del entorno
