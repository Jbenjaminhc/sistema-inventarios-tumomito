from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.category import Category
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.audit import log_action

def create_product(db: Session, product: ProductCreate, current_user: dict | None = None):
    existing_product = db.query(Product).filter(Product.code == product.code).first()
    if existing_product:
        raise HTTPException(status_code=400, detail="El código ya está en uso.")
    
    if product.category_id is not None:
        if not db.query(Category).filter(Category.id == product.category_id).first():
            raise HTTPException(status_code=400, detail="La categoría no existe")

    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    log_action(
        db,
        user=current_user,
        action="CREATE",
        entity_type="Product",
        entity_id=db_product.id,
        details={"code": db_product.code, "name": db_product.name},
    )
    return db_product

def get_products(db: Session):
    from sqlalchemy.orm import joinedload

    return db.query(Product).options(joinedload(Product.category)).all()


def get_product_by_code(db: Session, code: str):
    from sqlalchemy.orm import joinedload

    return (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.code == code)
        .first()
    )

def get_product(db: Session, product_id: int):
    from sqlalchemy.orm import joinedload

    return (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.id == product_id)
        .first()
    )

def update_product(db: Session, product_id: int, product_data: ProductUpdate, current_user: dict | None = None):
    if product_data.category_id is not None:
        if not db.query(Category).filter(Category.id == product_data.category_id).first():
            raise HTTPException(status_code=400, detail="La categoría no existe")
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        return None

    # Validar que el código no esté siendo usado por otro producto
    existing_with_code = (
        db.query(Product)
        .filter(Product.code == product_data.code, Product.id != product_id)
        .first()
    )
    if existing_with_code:
        raise HTTPException(status_code=400, detail="El código ya está en uso por otro producto.")

    for key, value in product_data.model_dump().items():
        setattr(db_product, key, value)
    db.commit()
    db.refresh(db_product)
    log_action(
        db,
        user=current_user,
        action="UPDATE",
        entity_type="Product",
        entity_id=db_product.id,
        details={"code": db_product.code, "name": db_product.name},
    )
    return db_product

def delete_product(db: Session, product_id: int, current_user: dict | None = None):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        return None
    db.delete(db_product)
    db.commit()
    log_action(
        db,
        user=current_user,
        action="DELETE",
        entity_type="Product",
        entity_id=product_id,
        details={"code": db_product.code, "name": db_product.name},
    )
    return db_product
