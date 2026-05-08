from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.inventory import InventoryCreate, InventoryResponse
from app.services.inventory import create_inventory, get_inventories

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.post("/", response_model=InventoryResponse)
def add_inventory(
    inventory: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return create_inventory(db, inventory)

@router.get("/", response_model=list[InventoryResponse])
def list_inventories(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return get_inventories(db)
