from sqlalchemy.orm import Session
from datetime import date
from app.models.batch import InventoryBatch
from app.models.product import Product
from app.models.purchase import PurchaseItem, PurchaseOrder
from app.models.supplier import Supplier

def get_expiry_report(db: Session):
    batches = db.query(
        InventoryBatch,
        Product.name.label("product_name"),
        Supplier.name.label("supplier_name")
    ).join(
        Product, InventoryBatch.product_id == Product.id
    ).outerjoin(
        PurchaseItem, InventoryBatch.purchase_item_id == PurchaseItem.id
    ).outerjoin(
        PurchaseOrder, PurchaseItem.purchase_id == PurchaseOrder.id
    ).outerjoin(
        Supplier, PurchaseOrder.supplier_id == Supplier.id
    ).filter(
        InventoryBatch.expiry_date.isnot(None),
        InventoryBatch.remaining_quantity > 0
    ).order_by(
        InventoryBatch.expiry_date.asc()
    ).all()

    today = date.today()
    report = []

    for batch, product_name, supplier_name in batches:
        days_left = (batch.expiry_date - today).days

        if days_left < 0:
            status = "expired"
        elif 0 <= days_left <= 30:
            status = "expiring_soon"
        else:
            status = "healthy"

        report.append({
            "id": batch.id,
            "product_id": batch.product_id,
            "product_name": product_name,
            "supplier_name": supplier_name,
            "received_at": batch.received_at,
            "expiry_date": batch.expiry_date,
            "remaining_quantity": batch.remaining_quantity,
            "unit_cost": batch.unit_cost,
            "total_value": batch.remaining_quantity * batch.unit_cost,
            "days_left": days_left,
            "status": status
        })

    return report
