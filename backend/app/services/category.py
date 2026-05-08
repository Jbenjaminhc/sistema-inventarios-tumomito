from sqlalchemy.orm import Session

from fastapi import HTTPException

from app.models.category import Category


def get_categories(db: Session):
    return db.query(Category).order_by(Category.name.asc()).all()


def get_category(db: Session, category_id: int):
    return db.query(Category).filter(Category.id == category_id).first()


def create_category(db: Session, name: str, description: str | None):
    existing = db.query(Category).filter(Category.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="La categoría ya existe")
    category = Category(name=name, description=description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category_id: int, name: str, description: str | None):
    category = get_category(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    existing = (
        db.query(Category)
        .filter(Category.name == name, Category.id != category_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="El nombre ya está en uso")

    category.name = name
    category.description = description
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int):
    category = get_category(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    db.delete(category)
    db.commit()
    return {"detail": "ok"}
