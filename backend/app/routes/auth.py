from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.core.auth import authenticate_user, create_access_token
from app.schemas.auth import LoginSchema, TokenSchema
from app.services.audit import log_action

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenSchema)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(minutes=30),
    )
    log_action(
        db,
        user={"id": user.id, "username": user.username, "role": user.role},
        action="LOGIN",
        entity_type="User",
        entity_id=user.id,
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login/json", response_model=TokenSchema)
def login_json(user: LoginSchema = Body(...), db: Session = Depends(get_db)):
    authenticated_user = authenticate_user(db, user.username, user.password)
    if not authenticated_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": authenticated_user.username, "role": authenticated_user.role},
        expires_delta=timedelta(minutes=30),
    )
    log_action(
        db,
        user={
            "id": authenticated_user.id,
            "username": authenticated_user.username,
            "role": authenticated_user.role,
        },
        action="LOGIN",
        entity_type="User",
        entity_id=authenticated_user.id,
    )
    return {"access_token": access_token, "token_type": "bearer"}