from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.supplier import SupplierOut

class PurchaseItemBase(BaseModel):
    product_id: int
    quantity: int
    unit_cost: float

class PurchaseItemCreate(PurchaseItemBase):
    pass

class PurchaseItemOut(PurchaseItemBase):
    id: int
    purchase_id: int
    subtotal: float

    class Config:
        from_attributes = True

class PurchaseOrderBase(BaseModel):
    supplier_id: int
    po_number: str

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseItemCreate]

class PurchaseOrderUpdate(BaseModel):
    status: str

class PurchaseOrderOut(PurchaseOrderBase):
    id: int
    date: datetime
    status: str
    total: float
    items: List[PurchaseItemOut]
    supplier: Optional[SupplierOut] = None

    class Config:
        from_attributes = True
