from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.services import category as category_service
from app.services.audit import log_action


router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", response_model=list[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    return category_service.get_categories(db)


@router.post("/", response_model=CategoryResponse)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    category = category_service.create_category(db, payload.name, payload.description)
    log_action(
        db,
        user=current_user,
        action="CREATE",
        entity_type="Category",
        entity_id=category.id,
        details={"name": category.name},
    )
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    category = category_service.update_category(db, category_id, payload.name, payload.description)
    log_action(
        db,
        user=current_user,
        action="UPDATE",
        entity_type="Category",
        entity_id=category.id,
        details={"name": category.name},
    )
    return category


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    resp = category_service.delete_category(db, category_id)
    log_action(
        db,
        user=current_user,
        action="DELETE",
        entity_type="Category",
        entity_id=category_id,
    )
    return resp
