from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field

# Producto simplificado para creación (solo se requiere ID y cantidad)
class DispatchProductCreate(BaseModel):
    product_id: int
    quantity: int

class DispatchBatchAllocation(BaseModel):
    batch_id: int
    batch_expiry: Optional[date] = None
    unit_cost: float
    quantity_despached: int

# Producto completo con nombre y código (usado en respuestas)
class DispatchProduct(BaseModel):
    product_id: int
    code: str
    name: str
    quantity: int
    fifo_cost: Optional[float] = None
    avg_unit_cost: Optional[float] = None
    batch_allocations: List[DispatchBatchAllocation] = Field(default_factory=list)

# Esquema para crear una orden de despacho
class DispatchCreate(BaseModel):
    order_number: str
    tracking_number: str
    created_by: str
    products: List[DispatchProductCreate]
    carrier: Optional[str] = None  # opcional pero soportado

# Esquema para devolver una orden de despacho
class DispatchResponse(BaseModel):
    id: int
    order_number: str
    tracking_number: str
    products: List[DispatchProduct]
    created_by: str
    created_at: str
    carrier: Optional[str] = None

    class Config:
        from_attributes = True

# Orden compacta para listas (historial)
class DispatchOrder(BaseModel):
    id: int
    order_number: str
    tracking_number: str
    created_at: datetime
    operator: str
    total_products: int
    carrier: Optional[str] = None

    class Config:
        from_attributes = True
