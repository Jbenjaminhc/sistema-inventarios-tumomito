"""Compat layer.

Este módulo existía en iteraciones previas del prototipo.
Para evitar rupturas, re-exporta utilidades desde app.core.security.
"""

from app.core.security import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    hash_password,
    verify_password,
    create_access_token,
)
