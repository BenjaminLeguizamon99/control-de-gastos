from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import CurrentUserId
from app.db import SessionDep
from app.repositories.probe_repo import get_probe

router = APIRouter()


class ProbeRead(BaseModel):
    id: UUID
    created_at: datetime


@router.get("/probes/{probe_id}")
def read_probe(probe_id: UUID, user_id: CurrentUserId, session: SessionDep) -> ProbeRead:
    probe = get_probe(session, user_id, probe_id)
    if probe is None:
        raise HTTPException(404, "Not found")  # 404 y no 403: no revelar que existe
    return ProbeRead.model_validate(probe, from_attributes=True)
