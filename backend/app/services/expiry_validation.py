from datetime import date
from fastapi import HTTPException
from app.models.batch import InventoryBatch

def validate_lot_not_expired(batch: InventoryBatch):
    if batch.expiry_date is None:
        return True
    
    today = date.today()
    if batch.expiry_date <= today:
        raise HTTPException(
            status_code=400,
            detail=f"Lote vencido:{batch.id}: Este lote está vencido y no puede despacharse."
        )
    return True
