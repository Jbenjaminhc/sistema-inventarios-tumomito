from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_admin, get_current_user
from app.schemas.purchase import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderOut
from app.services import purchase as purchase_service

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])

@router.get("/", response_model=list[PurchaseOrderOut])
def get_purchase_orders(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return purchase_service.get_purchase_orders(db)

@router.post("/", response_model=PurchaseOrderOut)
def create_purchase_order(po: PurchaseOrderCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return purchase_service.create_purchase_order(db, po, current_user)

@router.put("/{po_id}/status", response_model=PurchaseOrderOut)
def update_purchase_order_status(po_id: int, po_update: PurchaseOrderUpdate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return purchase_service.update_purchase_order_status(db, po_id, po_update, current_user)

@router.get("/{po_id}", response_model=PurchaseOrderOut)
def get_purchase_order(po_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    po = purchase_service.get_purchase_order(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return po
