from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class InventoryBatch(Base):
    __tablename__ = "inventory_batches"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    purchase_item_id = Column(Integer, ForeignKey("purchase_items.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    remaining_quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    expiry_date = Column(Date, nullable=True) # Mapped[date | None]
    location = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product")
    purchase_item = relationship("PurchaseItem")

    @property
    def product_name(self) -> str:
        return self.product.name if self.product else "Desconocido"

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("inventory_batches.id"), nullable=True)
    movement_type = Column(String, nullable=False) # 'IN', 'OUT'
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)
    reference_type = Column(String, nullable=False) # 'purchase', 'dispatch', 'return'
    reference_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product")
    batch = relationship("InventoryBatch")

    @property
    def product_name(self) -> str:
        return self.product.name if self.product else "Desconocido"
