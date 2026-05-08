from sqlalchemy.orm import Session
from app.models.purchase import PurchaseOrder, PurchaseItem
from app.models.inventory import Inventory
from app.models.product import Product
from app.schemas.purchase import PurchaseOrderCreate, PurchaseOrderUpdate
from app.services.audit import log_action
from fastapi import HTTPException

def get_purchase_orders(db: Session):
    return db.query(PurchaseOrder).all()

def get_purchase_order(db: Session, po_id: int):
    return db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()

def create_purchase_order(db: Session, po: PurchaseOrderCreate, current_user: dict):
    # Calcular totales y validar productos
    total = 0.0
    for item in po.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Producto con id {item.product_id} no existe.")
        total += item.quantity * item.unit_cost

    db_po = PurchaseOrder(
        supplier_id=po.supplier_id,
        po_number=po.po_number,
        total=total,
        status="pending"
    )
    db.add(db_po)
    db.commit()
    db.refresh(db_po)

    # Crear items
    for item in po.items:
        subtotal = item.quantity * item.unit_cost
        db_item = PurchaseItem(
            purchase_id=db_po.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            subtotal=subtotal
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_po)
    log_action(db, user=current_user, action="CREATE", entity_type="PurchaseOrder", entity_id=db_po.id, details={"po_number": db_po.po_number})
    return db_po

def update_purchase_order_status(db: Session, po_id: int, po_update: PurchaseOrderUpdate, current_user: dict):
    db_po = get_purchase_order(db, po_id)
    if not db_po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    
    if db_po.status == "completed" and po_update.status != "completed":
        raise HTTPException(status_code=400, detail="No se puede cambiar una orden ya completada")

    # La actualización de inventario ahora se maneja al "recibir" la orden y generar lotes

    
    db_po.status = po_update.status
    db.commit()
    db.refresh(db_po)
    log_action(db, user=current_user, action="UPDATE_STATUS", entity_type="PurchaseOrder", entity_id=db_po.id, details={"new_status": db_po.status})
    return db_po
