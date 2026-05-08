from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_admin, get_current_user
from app.schemas.batch import InventoryBatchOut, InventoryMovementOut, ReceptionCreate
from app.services import batch as batch_service

router = APIRouter(tags=["Batches & Inventory"])

@router.post("/purchase-orders/{po_id}/receive", response_model=dict)
def receive_purchase_order(po_id: int, reception: ReceptionCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    po = batch_service.receive_purchase_order(db, po_id, current_user, reception)
    return {"message": "Mercadería recibida, lotes generados y stock actualizado", "po_id": po.id}

@router.get("/batches", response_model=list[InventoryBatchOut])
def get_batches(product_id: int = None, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return batch_service.get_batches(db, product_id)

@router.get("/kardex", response_model=list[InventoryMovementOut])
def get_movements(product_id: int = None, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return batch_service.get_movements(db, product_id)
