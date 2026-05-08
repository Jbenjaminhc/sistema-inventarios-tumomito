from __future__ import annotations

import json
from collections import defaultdict
from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.batch import InventoryBatch, InventoryMovement
from app.models.dispatch import Dispatch
from app.models.product import Product
from app.models.returns import Return
from app.schemas.returns import ReturnLotProductIn, ReturnLotProductOut
from app.services.audit import log_action


def _load_dispatch_products(dispatch: Dispatch) -> list[dict]:
    try:
        return json.loads(dispatch.products_json or "[]")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="El despacho tiene un formato de productos inválido.")


def _extract_batch_allocations(dispatch_products: list[dict]) -> list[dict]:
    allocations: list[dict] = []

    for product_item in dispatch_products:
        product_id = product_item.get("product_id")
        product_name = product_item.get("name") or product_item.get("product_name") or "Desconocido"
        code = product_item.get("code") or "N/A"

        raw_allocations = product_item.get("batch_allocations") or product_item.get("batches_consumed") or []
        if not raw_allocations:
            raw_allocations = [{
                "batch_id": product_item.get("batch_id"),
                "batch_expiry": product_item.get("batch_expiry"),
                "unit_cost": product_item.get("avg_unit_cost") or product_item.get("unit_cost") or 0.0,
                "quantity_despached": product_item.get("quantity") or product_item.get("quantity_despached") or 0,
            }]

        for allocation in raw_allocations:
            batch_id = allocation.get("batch_id")
            if batch_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="El despacho no contiene lote para uno de los productos. No se puede procesar la devolución por lote.",
                )

            qty = int(allocation.get("quantity_despached") or allocation.get("quantity") or 0)
            if qty <= 0:
                continue

            allocations.append({
                "product_id": product_id,
                "product_name": product_name,
                "code": code,
                "batch_id": int(batch_id),
                "batch_expiry": allocation.get("batch_expiry"),
                "unit_cost": float(allocation.get("unit_cost") or 0.0),
                "quantity_despached": qty,
            })

    return allocations


def get_dispatch_return_items(db: Session, dispatch: Dispatch) -> list[dict]:
    return _extract_batch_allocations(_load_dispatch_products(dispatch))


def process_return(
    db: Session,
    dispatch_id: int,
    items: list[ReturnLotProductIn],
    observation: str | None,
    user: dict | None,
    tracking_number: str | None = None,
):
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Despacho no encontrado.")

    if tracking_number and tracking_number != dispatch.tracking_number:
        raise HTTPException(status_code=400, detail="La guía no coincide con el despacho seleccionado.")

    existing_return = db.query(Return).filter(Return.tracking_number == dispatch.tracking_number).first()
    if existing_return:
        raise HTTPException(status_code=400, detail="Esta guía ya fue devuelta.")

    dispatch_items = get_dispatch_return_items(db, dispatch)
    dispatch_map: dict[tuple[int, int], dict] = {
        (item["product_id"], item["batch_id"]): item for item in dispatch_items
    }

    requested_map: dict[tuple[int, int], int] = defaultdict(int)
    for item in items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="La cantidad devuelta debe ser mayor que cero.")
        requested_map[(item.product_id, item.batch_id)] += item.quantity

    batch_ids = {batch_id for _, batch_id in requested_map.keys()}
    batches = (
        db.query(InventoryBatch)
        .filter(InventoryBatch.id.in_(batch_ids))
        .with_for_update()
        .all()
    )
    batch_map = {batch.id: batch for batch in batches}

    products = (
        db.query(Product)
        .filter(Product.id.in_({product_id for product_id, _ in requested_map.keys()}))
        .with_for_update()
        .all()
    )
    product_map = {product.id: product for product in products}

    for (product_id, batch_id), quantity in requested_map.items():
        dispatch_item = dispatch_map.get((product_id, batch_id))
        if not dispatch_item:
            raise HTTPException(status_code=400, detail=f"El lote {batch_id} no pertenece al despacho indicado.")

        if quantity > int(dispatch_item["quantity_despached"]):
            raise HTTPException(status_code=400, detail="No se puede devolver más de lo despachado por lote.")

        batch = batch_map.get(batch_id)
        if not batch:
            raise HTTPException(status_code=404, detail="El lote original ya no existe.")

        if batch.product_id != product_id:
            raise HTTPException(status_code=400, detail="El lote no corresponde al producto indicado.")

        if batch.expiry_date and batch.expiry_date < date.today():
            raise HTTPException(status_code=400, detail="No se puede devolver un lote vencido.")

        if product_id not in product_map:
            raise HTTPException(status_code=404, detail=f"Producto con ID {product_id} no encontrado.")

    return_record = Return(
        tracking_number=dispatch.tracking_number,
        carrier=dispatch.carrier,
        observation=observation,
        created_by=(user.get("username") if user else None) or (user.get("name") if user else None) or "Operador",
        products_json=json.dumps([]),
    )
    db.add(return_record)
    db.flush()

    returned_products: list[dict] = []
    audit_entries: list[dict] = []

    for (product_id, batch_id), quantity in requested_map.items():
        batch = batch_map[batch_id]
        product = product_map[product_id]
        dispatch_item = dispatch_map[(product_id, batch_id)]
        total_cost = float(quantity) * float(batch.unit_cost)

        batch.remaining_quantity += quantity
        product.stock += quantity

        db.add(
            InventoryMovement(
                product_id=product_id,
                batch_id=batch_id,
                movement_type="RETURN",
                quantity=quantity,
                unit_cost=batch.unit_cost,
                total_cost=total_cost,
                reference_type="RETURN",
                reference_id=return_record.id,
            )
        )

        returned_products.append({
            "product_id": product_id,
            "product_name": product.name,
            "code": product.code,
            "batch_id": batch_id,
            "batch_expiry": batch.expiry_date.isoformat() if batch.expiry_date else dispatch_item.get("batch_expiry"),
            "unit_cost": float(batch.unit_cost),
            "quantity_despached": int(dispatch_item["quantity_despached"]),
            "quantity_returned": quantity,
            "total_cost": total_cost,
            "movement_reference": f"RETURN-{return_record.id}",
        })

        audit_entries.append({
            "dispatch_id": dispatch.id,
            "batch_id": batch_id,
            "quantity": quantity,
            "cost": total_cost,
        })

    return_record.products_json = json.dumps(returned_products)
    db.commit()
    db.refresh(return_record)

    for entry in audit_entries:
        log_action(
            db,
            user=user,
            action="return_with_lot",
            entity_type="Return",
            entity_id=return_record.id,
            details=entry,
        )

    return {
        "id": return_record.id,
        "dispatch_id": dispatch.id,
        "tracking_number": return_record.tracking_number,
        "carrier": return_record.carrier,
        "observation": return_record.observation,
        "created_by": return_record.created_by,
        "created_at": return_record.created_at,
        "products": returned_products,
    }