from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List, Dict

from app.models.dispatch import Dispatch
from app.models.product import Product
import json


def get_dashboard_summary(db: Session, range: str = "today") -> Dict:
    today = datetime.now().date()

    # Determinar rango de fechas
    if range == "today":
        start = datetime.combine(today, datetime.min.time())
        end = datetime.combine(today, datetime.max.time())
    elif range == "month":
        start = datetime(today.year, today.month, 1)
        end = datetime.combine(today, datetime.max.time())
    else:
        raise ValueError("Rango inválido. Usa 'today' o 'month'.")

    # Despachos en el rango
    dispatches = db.query(Dispatch).filter(
        and_(Dispatch.created_at >= start, Dispatch.created_at <= end)
    ).all()

    # Contar total de despachos
    total_dispatches = len(dispatches)

    # Contar Productos de alta rotación

    product_counts = {}
    for dispatch in dispatches:
        items = json.loads(dispatch.products_json)
        for item in items:
            key = item["product_id"]
            product_counts[key] = product_counts.get(key, 0) + item["quantity"]

    # Obtener datos de los productos
    top_products = []
    if product_counts:
        product_ids = list(product_counts.keys())
        products = db.query(Product).filter(Product.id.in_(product_ids)).all()
        for product in products:
            top_products.append({
                "code": product.code,
                "name": product.name,
                "quantity": product_counts.get(product.id, 0)
            })

        # Ordenar por cantidad
        top_products.sort(key=lambda x: x["quantity"], reverse=True)

    # Productos con stock bajo
    low_stock = db.query(Product).filter(Product.stock < 10).all()
    low_stock_list = [
        {"code": p.code, "name": p.name, "stock": p.stock} for p in low_stock
    ]

    return {
        "total_dispatches": total_dispatches,
        "top_products": top_products[:10],  # top 10
        "low_stock": low_stock_list
    }
