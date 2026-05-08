from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.base import Base


# --- Env loading ---
# La idea del proyecto es que TODA la configuración salga del .env del backend.
# Usamos override=True para evitar que variables del sistema (Windows) “pisen” el .env.
BACKEND_DIR = Path(__file__).resolve().parents[2]  # .../backend
ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL no está definido. Configúralo en backend/.env (ej: postgresql+psycopg://...)."
    )


engine = create_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependencia para obtener una sesión de base de datos."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
