from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext


# --- Env loading ---
BACKEND_DIR = Path(__file__).resolve().parents[2]  # .../backend
ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)


logging.basicConfig(level=logging.INFO)


SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # Para prototipo/desarrollo, permitimos fallback con advertencia.
    # En producción debes definir SECRET_KEY en variables de entorno.
    logging.warning("SECRET_KEY no está definido. Usando clave de desarrollo (NO usar en producción).")
    SECRET_KEY = "dev-only-secret-key"


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


# --- Password hashing ---
# Nota: bcrypt suele generar fricciones en Python 3.13 dependiendo de versiones.
# Para evitar problemas y elevar el nivel de seguridad, usamos Argon2.
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if datetime.utcnow() > datetime.fromtimestamp(payload.get("exp", 0)):
            raise JWTError("Token has expired")
        return payload
    except JWTError:
        logging.error("Error al verificar el token JWT.")
        return None
