from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ConsumptionMethodUpdate
from app.core.dependencies import get_current_user, require_admin
from app.services import product as product_service
from fastapi.responses import StreamingResponse
import io
import pandas as pd

router = APIRouter(prefix="/products", tags=["Products"])

# Función auxiliar para obtener producto o lanzar 404
def get_product_or_404(product_id: int, db: Session) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.get("/", response_model=list[ProductResponse])
def get_products(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return product_service.get_products(db)

@router.get("/public", response_model=list[ProductResponse])
def get_public_products(db: Session = Depends(get_db)):
    """Ruta pública para la tienda virtual, sin autenticación"""
    return product_service.get_products(db)


@router.get("/by-code/{code}", response_model=ProductResponse)
def get_product_by_code(
    code: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    product = product_service.get_product_by_code(db, code)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/", response_model=ProductResponse)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return product_service.create_product(db, product, current_user)

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return product_service.update_product(db, product_id, product_data, current_user)

@router.patch("/{product_id}/consumption-method", response_model=ProductResponse)
def update_consumption_method(
    product_id: int,
    data: ConsumptionMethodUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    if data.method not in ["PEPS", "FEFO"]:
        raise HTTPException(status_code=400, detail="Método de consumo inválido")
    product = get_product_or_404(product_id, db)
    
    if data.method == "FEFO":
        # Validar si tiene algun lote con fecha de vencimiento
        from app.models.batch import InventoryBatch
        has_expiry = db.query(InventoryBatch).filter(
            InventoryBatch.product_id == product_id,
            InventoryBatch.expiry_date.isnot(None)
        ).first()
        if not has_expiry:
            raise HTTPException(
                status_code=400,
                detail="No se puede cambiar a FEFO: El producto no tiene ningún lote con fecha de vencimiento registrada."
            )
            
    product.consumption_method = data.method
    db.commit()
    db.refresh(product)
    from app.services.audit import log_action
    log_action(db, user=current_user, action="UPDATE_CONSUMPTION_METHOD", entity_type="Product", entity_id=product.id, details={"new_method": data.method})
    return product

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return product_service.delete_product(db, product_id, current_user)

@router.get("/export/xls/")
def export_products_to_excel(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    products = db.query(Product).all()

    # Convertir a DataFrame
    data = [
        {
            "Código": p.code,
            "Nombre": p.name,
            "Descripción": p.description,
            "Precio": p.price,
            "Stock": p.stock
        }
        for p in products
    ]

    df = pd.DataFrame(data)

    # Guardar en buffer
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        df.to_excel(writer, index=False, sheet_name="Productos")

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=productos.xlsx"}
    )
