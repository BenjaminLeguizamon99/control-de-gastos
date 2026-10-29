from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health, me, probes

app = FastAPI(title="Control de Gastos API", redirect_slashes=False)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(health.router)
app.include_router(me.router)
app.include_router(probes.router)
