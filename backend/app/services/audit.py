from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    *,
    user: dict | None,
    action: str,
    entity_type: str,
    entity_id: int | None,
    details: Any | None = None,
) -> None:
    """Registro centralizado de auditoría.

    No debe interrumpir la operación principal si falla el log.
    """

    try:
        log = AuditLog(
            user_id=user.get("id") if user else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
