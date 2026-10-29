import uuid
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.probe import Probe
from tests.conftest import USER_A, USER_B, auth, make_token


def create_probe(db_session: Session, owner: str) -> UUID:
    probe = Probe(user_id=UUID(owner))
    db_session.add(probe)
    db_session.commit()
    return probe.id


def test_other_user_gets_404(client: TestClient, db_session: Session) -> None:
    probe_id = create_probe(db_session, USER_A)
    r = client.get(f"/probes/{probe_id}", headers=auth(make_token(USER_B)))
    assert r.status_code == 404
    assert r.json() == {"detail": "Not found"}


def test_owner_gets_200(client: TestClient, db_session: Session) -> None:
    probe_id = create_probe(db_session, USER_A)
    r = client.get(f"/probes/{probe_id}", headers=auth(make_token(USER_A)))
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == str(probe_id)
    assert "created_at" in body


def test_missing_probe_404(client: TestClient, db_session: Session) -> None:
    r = client.get(f"/probes/{uuid.uuid4()}", headers=auth(make_token(USER_A)))
    assert r.status_code == 404


def test_no_token_401(client: TestClient, db_session: Session) -> None:
    probe_id = create_probe(db_session, USER_A)
    r = client.get(f"/probes/{probe_id}")
    assert r.status_code == 401


def test_invalid_probe_id_422(client: TestClient) -> None:
    r = client.get("/probes/abc", headers=auth(make_token(USER_A)))
    assert r.status_code == 422
