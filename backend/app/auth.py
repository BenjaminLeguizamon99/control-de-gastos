from functools import lru_cache
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings


@lru_cache
def get_jwks_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{get_settings().supabase_url}/auth/v1/.well-known/jwks.json")


def get_current_user_id(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(HTTPBearer())],
    jwks: Annotated[jwt.PyJWKClient, Depends(get_jwks_client)],
) -> UUID:
    s = get_settings()
    try:
        key = jwks.get_signing_key_from_jwt(creds.credentials)
        claims = jwt.decode(
            creds.credentials,
            key,
            algorithms=["ES256", "RS256"],  # fijos: nunca leidos del header (evita HS256/none)
            audience="authenticated",
            issuer=f"{s.supabase_url}/auth/v1",
            options={"require": ["exp", "sub", "aud", "iss"]},
        )
        user_id = UUID(claims["sub"])
    except jwt.PyJWKClientConnectionError:
        # JWKS caido: no es culpa del token, que el cliente reintente
        raise HTTPException(503, "Auth provider unavailable") from None
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(401, "Invalid token", headers={"WWW-Authenticate": "Bearer"}) from None
    if user_id not in s.allowed_user_ids:
        raise HTTPException(403, "Forbidden")
    return user_id


CurrentUserId = Annotated[UUID, Depends(get_current_user_id)]
