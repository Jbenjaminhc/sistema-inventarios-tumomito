"""Autenticación (JWT) y helpers.

Fuente única para autenticación.
La criptografía y emisión/validación de tokens vive en app.core.security.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.services.user import get_user_by_username


def authenticate_user(db: Session, username: str, password: str):
    """Valida credenciales contra BD. Retorna el usuario o None."""
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


__all__ = ["authenticate_user", "create_access_token"]
