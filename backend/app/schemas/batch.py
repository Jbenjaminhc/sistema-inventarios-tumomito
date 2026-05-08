from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

class ReceptionItemCreate(BaseModel):
    purchase_item_id: int
    expiry_date: Optional[date] = None

class ReceptionCreate(BaseModel):
    location: Optional[str] = None
    items: Optional[List[ReceptionItemCreate]] = None

class InventoryBatchBase(BaseModel):
    product_id: int
    purchase_item_id: Optional[int] = None
    quantity: int
    remaining_quantity: int
    unit_cost: float
    expiry_date: Optional[date] = None
    location: Optional[str] = None

class InventoryBatchOut(InventoryBatchBase):
    id: int
    product_name: str
    received_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class InventoryMovementBase(BaseModel):
    product_id: int
    batch_id: Optional[int] = None
    movement_type: str
    quantity: int
    unit_cost: float
    total_cost: float
    reference_type: str
    reference_id: int

class InventoryMovementOut(InventoryMovementBase):
    id: int
    product_name: str
    created_at: datetime

    class Config:
        from_attributes = True

class ReceptionCreateOld(BaseModel): # Removing the old one
    location: Optional[str] = None
