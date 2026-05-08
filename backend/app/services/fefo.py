from sqlalchemy.orm import Session
from sqlalchemy import nullslast
from app.models.batch import InventoryBatch, InventoryMovement
from app.services.batch import recalculate_product_stock
from fastapi import HTTPException
from datetime import date
from app.services.expiry_validation import validate_lot_not_expired

def consume_stock_fefo(db: Session, product_id: int, quantity: int, reference_type: str, reference_id: int):
    # Obtener lotes ordenados por vencimiento (FEFO)
    batches = db.query(InventoryBatch).filter(
        InventoryBatch.product_id == product_id,
        InventoryBatch.remaining_quantity > 0
    ).order_by(
        nullslast(InventoryBatch.expiry_date.asc()),
        InventoryBatch.received_at.asc(),
        InventoryBatch.id.asc()
    ).all()

    # Validar que si no hay lotes con fecha de vencimiento, no usar FEFO
    has_expiry_dates = any(b.expiry_date is not None for b in batches)
    if not has_expiry_dates and batches:
        raise HTTPException(
            status_code=400,
            detail="No se puede aplicar FEFO: El producto no tiene lotes con fecha de vencimiento registrada."
        )

    # Ya no filtramos previamente, lo hacemos dinámicamente con la validación
    remaining_to_consume = quantity
    total_cost = 0.0
    consumed_info = []

    # Validar stock total (usando solo los que no están vencidos para evitar fallos de stock falso)
    today = date.today()
    total_available = sum(b.remaining_quantity for b in batches if b.expiry_date is None or b.expiry_date > today)
    if total_available < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Stock válido insuficiente para aplicar FEFO (se excluyen lotes vencidos). Requerido: {quantity}, Disponible: {total_available}"
        )

    for batch in batches:
        if remaining_to_consume <= 0:
            break

        try:
            validate_lot_not_expired(batch)
        except HTTPException:
            # FEFO debe saltar lotes vencidos y usar el siguiente válido
            continue

        consume_from_batch = min(batch.remaining_quantity, remaining_to_consume)
        
        batch.remaining_quantity -= consume_from_batch
        remaining_to_consume -= consume_from_batch
        
        cost_for_this_batch = consume_from_batch * batch.unit_cost
        total_cost += cost_for_this_batch

        consumed_info.append({
            "batch_id": batch.id,
            "quantity": consume_from_batch,
            "unit_cost": batch.unit_cost,
            "batch_expiry": batch.expiry_date.isoformat() if batch.expiry_date else None,
        })

        # Registrar movimiento de salida
        movement = InventoryMovement(
            product_id=product_id,
            batch_id=batch.id,
            movement_type="OUT",
            quantity=consume_from_batch,
            unit_cost=batch.unit_cost,
            total_cost=cost_for_this_batch,
            reference_type=reference_type,
            reference_id=reference_id
        )
        db.add(movement)

    if remaining_to_consume > 0:
        raise HTTPException(status_code=400, detail="Error inesperado durante el consumo FEFO.")

    db.flush()
    # Recalcular el stock total del producto en base a los lotes restantes
    recalculate_product_stock(db, product_id)
    db.flush()

    return {
        "consumed_quantity": quantity,
        "total_cost": total_cost,
        "average_unit_cost": total_cost / quantity if quantity > 0 else 0,
        "batches_consumed": consumed_info
    }
