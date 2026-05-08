from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.schemas.report import ExpiryReportItem
from app.services.report_expiry import get_expiry_report

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/expiry", response_model=List[ExpiryReportItem])
def api_get_expiry_report(db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return get_expiry_report(db)
