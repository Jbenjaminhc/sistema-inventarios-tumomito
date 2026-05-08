from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.models.batch import InventoryBatch, InventoryMovement
from app.models.purchase import PurchaseOrder, PurchaseItem
from app.models.product import Product
from app.services.audit import log_action
from fastapi import HTTPException
from app.schemas.batch import ReceptionCreate

def receive_purchase_order(db: Session, po_id: int, current_user: dict, reception: ReceptionCreate = None):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    
    if po.status != "pending":
        raise HTTPException(status_code=400, detail="Solo se pueden recibir órdenes pendientes")

    batches_created = []
    
    expiry_map = {}
    if reception and reception.items:
        expiry_map = {item.purchase_item_id: item.expiry_date for item in reception.items}
    
    for item in po.items:
        # Crear Lote (Batch)
        batch = InventoryBatch(
            product_id=item.product_id,
            purchase_item_id=item.id,
            quantity=item.quantity,
            remaining_quantity=item.quantity,
            unit_cost=item.unit_cost,
            expiry_date=expiry_map.get(item.id)
        )
        db.add(batch)
        db.flush() # Para obtener batch.id
        batches_created.append(batch)

        # Crear Movimiento (Kardex)
        movement = InventoryMovement(
            product_id=item.product_id,
            batch_id=batch.id,
            movement_type="IN",
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            total_cost=item.quantity * item.unit_cost,
            reference_type="purchase",
            reference_id=po.id
        )
        db.add(movement)

    # Actualizar estado de la orden
    po.status = "received"
    db.commit()

    # Recalcular stock dinámicamente basado en batches
    for item in po.items:
        recalculate_product_stock(db, item.product_id)
        
    db.commit()
    log_action(db, user=current_user, action="RECEIVE", entity_type="PurchaseOrder", entity_id=po.id)
    return po

def recalculate_product_stock(db: Session, product_id: int):
    product = db.query(Product).filter(Product.id == product_id).first()
    if product:
        total_stock = db.query(func.sum(InventoryBatch.remaining_quantity))\
            .filter(InventoryBatch.product_id == product_id).scalar() or 0
        product.stock = total_stock

def get_batches(db: Session, product_id: int = None):
    query = db.query(InventoryBatch).options(joinedload(InventoryBatch.product))
    if product_id:
        query = query.filter(InventoryBatch.product_id == product_id)
    return query.all()

def get_movements(db: Session, product_id: int = None):
    from sqlalchemy.orm import joinedload
    query = db.query(InventoryMovement).options(joinedload(InventoryMovement.product))
    if product_id:
        query = query.filter(InventoryMovement.product_id == product_id)
    return query.order_by(InventoryMovement.created_at.desc()).all()
