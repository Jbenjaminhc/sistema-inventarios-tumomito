from pydantic import BaseModel
from datetime import date

class ExpiryAlertItem(BaseModel):
    lote_id: int
    product_name: str
    expiry_date: date
    days_left: int
    remaining_quantity: int
    total_value: float
    alert_type: str

    class Config:
        from_attributes = True
