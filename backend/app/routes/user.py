from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserResponse
from app.services.user import (
    create_user, get_users, get_user, update_user, delete_user, get_user_by_username
)
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.models.user import User
from app.services.audit import log_action

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserResponse)
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict | None = Depends(get_current_user_optional),
):
    """Crea usuarios.

    - Si no existe ningún usuario en BD (bootstrap), permite crear el primer usuario (idealmente admin).
    - Si ya hay usuarios, solo un admin autenticado puede crear nuevos.
    """

    user_count = db.query(User).count()
    if user_count > 0:
        # Requiere token y rol admin
        if current_user is None or current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Acceso prohibido")

    existing_user = get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    created = create_user(db, user)
    log_action(
        db,
        user=current_user,
        action="CREATE",
        entity_type="User",
        entity_id=created.id,
        details={"username": created.username, "role": created.role},
    )
    return created

@router.get("/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Acceso prohibido")
    return get_users(db)

@router.get("/{user_id}", response_model=UserResponse)
def retrieve_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if current_user["role"] != "admin" and current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Acceso prohibido")
    return user

@router.put("/{user_id}", response_model=UserResponse)
def modify_user(user_id: int, user_data: UserCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Acceso prohibido")
    updated_user = update_user(db, user_id, user_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    log_action(
        db,
        user=current_user,
        action="UPDATE",
        entity_type="User",
        entity_id=updated_user.id,
        details={"username": updated_user.username, "role": updated_user.role},
    )
    return updated_user

@router.delete("/{user_id}")
def remove_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Acceso prohibido")
    deleted_user = delete_user(db, user_id)
    if not deleted_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    log_action(
        db,
        user=current_user,
        action="DELETE",
        entity_type="User",
        entity_id=user_id,
        details={"username": deleted_user.username},
    )
    return {"message": "Usuario eliminado exitosamente"}
