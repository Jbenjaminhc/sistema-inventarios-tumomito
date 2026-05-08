from pydantic import BaseModel, Field

from app.schemas.category import CategoryResponse

class ProductBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)  # 👈 Agregado aquí
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=255)
    price: float = Field(..., gt=0)
    stock: int  # También puedes mover stock aquí si lo usas siempre
    consumption_method: str = Field(default="PEPS", pattern="^(PEPS|FEFO)$")
    category_id: int | None = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    pass

class ConsumptionMethodUpdate(BaseModel):
    method: str

class ProductResponse(ProductBase):
    id: int
    category: CategoryResponse | None = None

    class Config:
        from_attributes = True
