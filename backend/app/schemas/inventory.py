from pydantic import BaseModel
from typing import Optional

class InventoryBase(BaseModel):
    product_id: int
    quantity: int
    location: str

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    quantity: Optional[int] = None
    location: Optional[str] = None

class InventoryResponse(InventoryBase):
    id: int

    class Config:
        from_attributes = True
