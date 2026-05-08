from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.dashboard import get_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def dashboard_summary(
    range: str = Query("today", enum=["today", "month"]),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Devuelve el resumen del dashboard para hoy o el mes.
    """
    try:
        return get_dashboard_summary(db, range=range)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
