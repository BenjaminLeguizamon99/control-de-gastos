from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.probe import Probe


def get_probe(session: Session, user_id: UUID, probe_id: UUID) -> Probe | None:
    return session.scalar(select(Probe).where(Probe.id == probe_id, Probe.user_id == user_id))
