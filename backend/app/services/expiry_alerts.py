from sqlalchemy.orm import Session
from datetime import date
from app.models.batch import InventoryBatch
from app.models.product import Product

def get_expiry_alerts(db: Session):
    batches = db.query(
        InventoryBatch,
        Product.name.label("product_name")
    ).join(
        Product, InventoryBatch.product_id == Product.id
    ).filter(
        InventoryBatch.expiry_date.isnot(None),
        InventoryBatch.remaining_quantity > 0
    ).order_by(
        InventoryBatch.expiry_date.asc()
    ).all()

    today = date.today()
    alerts = []

    for batch, product_name in batches:
        days_left = (batch.expiry_date - today).days

        # Solo generar alerta si vence en 30 días o menos (o ya venció)
        if days_left <= 30:
            if days_left < 0:
                alert_type = "expired"
            elif days_left == 0:
                alert_type = "expires_today"
            elif 0 < days_left <= 7:
                alert_type = "expires_7"
            elif 7 < days_left <= 15:
                alert_type = "expires_15"
            else: # 15 < days_left <= 30
                alert_type = "expires_30"

            alerts.append({
                "lote_id": batch.id,
                "product_name": product_name,
                "expiry_date": batch.expiry_date,
                "days_left": days_left,
                "remaining_quantity": batch.remaining_quantity,
                "total_value": batch.remaining_quantity * batch.unit_cost,
                "alert_type": alert_type
            })

    return alerts
