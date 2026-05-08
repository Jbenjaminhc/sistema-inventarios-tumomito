from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.models.base import Base

class Return(Base):
    __tablename__ = "returns"

    id = Column(Integer, primary_key=True, index=True)
    tracking_number = Column(String, nullable=False, unique=True)  
    carrier = Column(String, nullable=True)
    observation = Column(Text, nullable=True)
    created_by = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    products_json = Column(Text, nullable=False)

    def __repr__(self):
        return f"<Return id={self.id} tracking='{self.tracking_number}'>"
