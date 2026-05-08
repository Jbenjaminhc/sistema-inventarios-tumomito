from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import HTTPException
import json

from app.models.dispatch import Dispatch
from app.models.product import Product
from app.schemas.dispatch import (
    DispatchCreate, DispatchOrder, DispatchResponse, DispatchProduct,
)
from app.services.audit import log_action


def create_dispatch(db: Session, dispatch_data: DispatchCreate, current_user: dict | None = None) -> DispatchResponse:
    existing = db.query(Dispatch).filter(Dispatch.tracking_number == dispatch_data.tracking_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="El número de guía ingresado ya ha sido despachado.")

    # Concurrencia: bloqueamos filas de productos involucrados durante la transacción
    product_ids = [p.product_id for p in dispatch_data.products]
    products = (
        db.query(Product)
        .filter(Product.id.in_(product_ids))
        .with_for_update()
        .all()
    )
    product_map = {p.id: p for p in products}

    # Validar existencia y stock
    for item in dispatch_data.products:
        product = product_map.get(item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto con ID {item.product_id} no encontrado.")
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Stock insuficiente para el producto {product.name}. "
                    f"Disponible: {product.stock}, requerido: {item.quantity}."
                ),
            )

    new_dispatch = Dispatch(
        order_number=dispatch_data.order_number,
        tracking_number=dispatch_data.tracking_number,
        carrier=dispatch_data.carrier,
        products_json=json.dumps([]),
        created_by=dispatch_data.created_by,
    )
    db.add(new_dispatch)
    db.flush()

    from app.services.fifo import consume_stock_fifo
    from app.services.fefo import consume_stock_fefo
    enriched_products = []

    for item in dispatch_data.products:
        product = product_map[item.product_id]
        
        # Aplicar motor de consumo (FEFO o PEPS)
        try:
            if product.consumption_method == "FEFO":
                consume_result = consume_stock_fefo(
                    db=db,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    reference_type="dispatch",
                    reference_id=new_dispatch.id
                )
                applied_method = "FEFO"
            else:
                consume_result = consume_stock_fifo(
                    db=db,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    reference_type="dispatch",
                    reference_id=new_dispatch.id
                )
                applied_method = "PEPS"
        except HTTPException as e:
            if "lote vencido:" in e.detail.lower():
                # Extract batch_id
                parts = e.detail.split(":")
                batch_id = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
                
                log_action(
                    db,
                    user=current_user,
                    action="attempt_dispatch_expired_lot",
                    entity_type="Product",
                    entity_id=product.id,
                    details={"requested_quantity": item.quantity, "batch_id": batch_id}
                )
                raise HTTPException(status_code=400, detail="No se puede despachar este producto porque uno de sus lotes está vencido.")
            raise e

        enriched_products.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "code": product.code,
            "name": product.name,
            "fifo_cost": consume_result["total_cost"],
            "avg_unit_cost": consume_result["average_unit_cost"],
            "consumption_method": applied_method,
            "batch_allocations": [
                {
                    "batch_id": batch_item["batch_id"],
                    "batch_expiry": batch_item.get("batch_expiry"),
                    "unit_cost": batch_item["unit_cost"],
                    "quantity_despached": batch_item["quantity"],
                }
                for batch_item in consume_result.get("batches_consumed", [])
            ],
        })

    new_dispatch.products_json = json.dumps(enriched_products)
    db.commit()
    db.refresh(new_dispatch)

    log_action(
        db,
        user=current_user,
        action="CREATE",
        entity_type="Dispatch",
        entity_id=new_dispatch.id,
        details={
            "order_number": new_dispatch.order_number,
            "tracking_number": new_dispatch.tracking_number,
            "carrier": new_dispatch.carrier,
        },
    )

    return new_dispatch


def parse_date(date_str: str) -> datetime:
    try:
        return datetime.strptime(date_str, "%Y-%m-%dT%H:%M")
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Formato inválido para fecha: {date_str}. Usa YYYY-MM-DDTHH:MM")


def get_dispatches(
    db: Session,
    query: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    tracking_number: Optional[str] = None
) -> List[DispatchOrder]:
    q = db.query(Dispatch)

    if tracking_number:
        q = q.filter(Dispatch.tracking_number == tracking_number)

    if query:
        q = q.filter(
            or_(
                Dispatch.order_number.ilike(f"%{query}%"),
                Dispatch.tracking_number.ilike(f"%{query}%"),
                Dispatch.created_by.ilike(f"%{query}%")
            )
        )

    if start_date:
        start = parse_date(start_date)
        q = q.filter(Dispatch.created_at >= start)

    if end_date:
        end = parse_date(end_date) + timedelta(days=1)
        q = q.filter(Dispatch.created_at < end)

    dispatches = q.order_by(Dispatch.created_at.desc()).all()
    return _serialize_dispatches(dispatches)


def _serialize_dispatches(dispatches: List[Dispatch]) -> List[DispatchOrder]:
    result = []
    for dispatch in dispatches:
        products = json.loads(dispatch.products_json)
        total_products = sum(item["quantity"] for item in products)
        result.append(
            DispatchOrder(
                id=dispatch.id,
                order_number=dispatch.order_number,
                tracking_number=dispatch.tracking_number,
                created_at=dispatch.created_at,
                operator=dispatch.created_by,
                total_products=total_products,
                carrier=dispatch.carrier
            )
        )
    return result

