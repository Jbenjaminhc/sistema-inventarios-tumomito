from sqlalchemy import Column, Integer, String, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.models.base import Base

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", name="fk_inventory_product"), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    location = Column(String(255), nullable=False)  # Se limita el tamaño de la cadena

    # Relación Many-to-One: Cada registro de inventario pertenece a un solo producto
    product = relationship("Product", back_populates="inventories")

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="check_quantity_non_negative"),
    )
