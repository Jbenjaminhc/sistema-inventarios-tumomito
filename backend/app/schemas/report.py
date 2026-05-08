from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class ExpiryReportItem(BaseModel):
    id: int
    product_id: int
    product_name: str
    supplier_name: Optional[str] = None
    received_at: datetime
    expiry_date: date
    remaining_quantity: int
    unit_cost: float
    total_value: float
    days_left: int
    status: str

    class Config:
        from_attributes = True
