from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_admin, get_current_user
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierOut
from app.services import supplier as supplier_service

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("/", response_model=list[SupplierOut])
def get_suppliers(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return supplier_service.get_suppliers(db)

@router.post("/", response_model=SupplierOut)
def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return supplier_service.create_supplier(db, supplier, current_user)

@router.put("/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: int, supplier: SupplierUpdate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    db_sup = supplier_service.update_supplier(db, supplier_id, supplier, current_user)
    if not db_sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return db_sup

@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    db_sup = supplier_service.delete_supplier(db, supplier_id, current_user)
    if not db_sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"message": "Supplier deleted successfully"}
