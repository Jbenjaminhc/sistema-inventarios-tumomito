from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_admin
from app.services.fifo import consume_stock_fifo
from app.services.fefo import consume_stock_fefo
from app.models.batch import InventoryBatch, InventoryMovement
from app.models.product import Product
from app.services.batch import recalculate_product_stock
from pydantic import BaseModel

router = APIRouter(tags=["FIFO Engine & Adjustments"])

class ConsumeRequest(BaseModel):
    product_id: int
    quantity: int
    reference_type: str
    reference_id: int

class AdjustmentIncrease(BaseModel):
    product_id: int
    quantity: int
    unit_cost: float
    reference_type: str = "adjustment"
    reference_id: int = 0

class AdjustmentDecrease(BaseModel):
    product_id: int
    quantity: int
    reference_type: str = "adjustment"
    reference_id: int = 0

@router.post("/fifo/consume")
def apply_fifo_consume(request: ConsumeRequest, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    result = consume_stock_fifo(db, request.product_id, request.quantity, request.reference_type, request.reference_id)
    db.commit()
    return result

@router.post("/fefo/consume")
def apply_fefo_consume(request: ConsumeRequest, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    result = consume_stock_fefo(db, request.product_id, request.quantity, request.reference_type, request.reference_id)
    db.commit()
    return result

@router.post("/inventory/adjustments/increase")
def adjust_increase(request: AdjustmentIncrease, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    batch = InventoryBatch(
        product_id=request.product_id,
        quantity=request.quantity,
        remaining_quantity=request.quantity,
        unit_cost=request.unit_cost,
    )
    db.add(batch)
    db.flush()

    movement = InventoryMovement(
        product_id=request.product_id,
        batch_id=batch.id,
        movement_type="IN",
        quantity=request.quantity,
        unit_cost=request.unit_cost,
        total_cost=request.quantity * request.unit_cost,
        reference_type=request.reference_type,
        reference_id=request.reference_id
    )
    db.add(movement)
    recalculate_product_stock(db, request.product_id)
    db.commit()
    return {"message": "Ajuste de entrada aplicado con éxito", "batch_id": batch.id}

@router.post("/inventory/adjustments/decrease")
def adjust_decrease(request: AdjustmentDecrease, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        if product.consumption_method == "FEFO":
            result = consume_stock_fefo(db, request.product_id, request.quantity, request.reference_type, request.reference_id)
            method = "FEFO"
        else:
            result = consume_stock_fifo(db, request.product_id, request.quantity, request.reference_type, request.reference_id)
            method = "PEPS"
    except HTTPException as e:
        if "lote vencido:" in e.detail.lower():
            raise HTTPException(status_code=400, detail="No se puede realizar ajuste negativo: Uno de los lotes seleccionados por el motor está vencido.")
        raise e

    db.commit()
    return {"message": f"Ajuste de salida aplicado con {method}", "details": result}

@router.patch("/dispatches/{dispatch_id}/apply-fifo")
def apply_fifo_to_dispatch(dispatch_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    from app.models.dispatch import Dispatch
    import json
    
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Despacho no encontrado")
        
    products = json.loads(dispatch.products_json)
    
    enriched_products = []
    
    for item in products:
        # Evitar doble consumo
        if "fifo_cost" in item:
            enriched_products.append(item)
            continue
            
        result = consume_stock_fifo(
            db=db,
            product_id=item["product_id"],
            quantity=item["quantity"],
            reference_type="dispatch",
            reference_id=dispatch.id
        )
        
        item["fifo_cost"] = result["total_cost"]
        item["avg_unit_cost"] = result["average_unit_cost"]
        enriched_products.append(item)
        
    dispatch.products_json = json.dumps(enriched_products)
    db.commit()
    
    return {"message": "FIFO aplicado exitosamente al despacho histórico", "dispatch_id": dispatch.id}
