from sqlalchemy.orm import Session
from app.models.batch import InventoryBatch, InventoryMovement
from app.services.batch import recalculate_product_stock
from app.services.expiry_validation import validate_lot_not_expired
from fastapi import HTTPException

def consume_stock_fifo(db: Session, product_id: int, quantity: int, reference_type: str, reference_id: int):
    # Obtener lotes ordenados por fecha de recepción (FIFO)
    batches = db.query(InventoryBatch).filter(
        InventoryBatch.product_id == product_id,
        InventoryBatch.remaining_quantity > 0
    ).order_by(InventoryBatch.received_at.asc()).all()

    remaining_to_consume = quantity
    total_cost = 0.0
    consumed_info = []

    # Validar stock total antes de empezar a descontar
    total_available = sum(b.remaining_quantity for b in batches)
    if total_available < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Stock insuficiente para aplicar FIFO. Requerido: {quantity}, Disponible: {total_available}"
        )

    for batch in batches:
        if remaining_to_consume <= 0:
            break

        # Validar vencimiento antes de consumir
        validate_lot_not_expired(batch)

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
        # Esto no debería pasar por la validación inicial, pero por seguridad
        raise HTTPException(status_code=400, detail="Error inesperado durante el consumo FIFO.")

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
