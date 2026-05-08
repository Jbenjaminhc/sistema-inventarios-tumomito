from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.schemas.alert import ExpiryAlertItem
from app.services.expiry_alerts import get_expiry_alerts

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("/expiry", response_model=List[ExpiryAlertItem])
def api_get_expiry_alerts(db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return get_expiry_alerts(db)
