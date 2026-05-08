from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import Base


from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON

JSONType = JSON().with_variant(JSONB, 'postgresql')


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, nullable=False, index=True)  # CREATE/UPDATE/DELETE/LOGIN...
    entity_type = Column(String, nullable=False, index=True)  # Product, Category...
    entity_id = Column(Integer, nullable=True, index=True)
    details = Column(JSONType, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User")
