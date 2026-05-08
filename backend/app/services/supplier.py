from sqlalchemy.orm import Session
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.services.audit import log_action

def get_suppliers(db: Session):
    return db.query(Supplier).all()

def get_supplier(db: Session, supplier_id: int):
    return db.query(Supplier).filter(Supplier.id == supplier_id).first()

def create_supplier(db: Session, supplier: SupplierCreate, current_user: dict):
    db_supplier = Supplier(**supplier.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    log_action(db, user=current_user, action="CREATE", entity_type="Supplier", entity_id=db_supplier.id, details={"name": db_supplier.name})
    return db_supplier

def update_supplier(db: Session, supplier_id: int, supplier: SupplierUpdate, current_user: dict):
    db_supplier = get_supplier(db, supplier_id)
    if db_supplier:
        update_data = supplier.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_supplier, key, value)
        db.commit()
        db.refresh(db_supplier)
        log_action(db, user=current_user, action="UPDATE", entity_type="Supplier", entity_id=db_supplier.id, details=update_data)
    return db_supplier

def delete_supplier(db: Session, supplier_id: int, current_user: dict):
    db_supplier = get_supplier(db, supplier_id)
    if db_supplier:
        db.delete(db_supplier)
        db.commit()
        log_action(db, user=current_user, action="DELETE", entity_type="Supplier", entity_id=supplier_id, details={"name": db_supplier.name})
    return db_supplier
