from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime


class ReturnLotProductIn(BaseModel):
    product_id: int
    batch_id: int
    quantity: int


class ReturnCreate(BaseModel):
    dispatch_id: int
    tracking_number: Optional[str] = None
    observation: Optional[str] = None
    products: List[ReturnLotProductIn]


class ReturnLotProductOut(BaseModel):
    product_id: int
    product_name: str
    code: str
    batch_id: int
    batch_expiry: Optional[date] = None
    unit_cost: float
    quantity_despached: int
    quantity_returned: Optional[int] = None
    total_cost: Optional[float] = None
    movement_reference: Optional[str] = None

    class Config:
        from_attributes = True


class ReturnResponse(BaseModel):
    id: int
    dispatch_id: Optional[int] = None
    tracking_number: str
    carrier: Optional[str] = None
    observation: Optional[str] = None
    created_by: str
    created_at: datetime
    products: List[ReturnLotProductOut]

    class Config:
        from_attributes = True


class ReturnDispatchResponse(BaseModel):
    dispatch_id: int
    order_number: str
    tracking_number: str
    carrier: Optional[str] = None
    products: List[ReturnLotProductOut]

