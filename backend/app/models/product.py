from sqlalchemy import Column, Integer, String, Float, CheckConstraint, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False) 
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    consumption_method = Column(String, default="PEPS", nullable=False)

    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)

    category = relationship("Category", back_populates="products")

    inventories = relationship("Inventory", back_populates="product")
    transactions = relationship("Transaction", back_populates="product")

    __table_args__ = (
        CheckConstraint("stock >= 0", name="check_stock_non_negative"),
    )
