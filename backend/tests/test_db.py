from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.db import SessionDep


def test_commit_failure_returns_5xx() -> None:
    # El commit tiene que correr antes de la respuesta: si falla, el cliente no ve un 2xx.
    app = FastAPI()

    def fail(session: Session) -> None:
        raise RuntimeError("commit failed")

    @app.post("/write")
    def write(session: SessionDep) -> dict[str, str]:
        event.listen(session, "before_commit", fail)
        return {"status": "ok"}

    with TestClient(app, raise_server_exceptions=False) as c:
        assert c.post("/write").status_code == 500
