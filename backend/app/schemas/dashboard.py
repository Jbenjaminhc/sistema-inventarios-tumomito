from pydantic import BaseModel
from typing import List


class TopProduct(BaseModel):
    code: str
    name: str
    quantity: int


class LowStockProduct(BaseModel):
    code: str
    name: str
    stock: int


class DashboardSummary(BaseModel):
    top_products: List[TopProduct]
    total_dispatches: int
    low_stock: List[LowStockProduct]
