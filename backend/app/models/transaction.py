from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)

    # Tipo de movimiento: entrada/salida/ajuste/venta/etc.
    transaction_type = Column(String(50), nullable=False)

    total_price = Column(Float, nullable=False)

    # Usuario que realizó la operación (opcional en MVP)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="transactions")
    user = relationship("User", back_populates="transactions")
