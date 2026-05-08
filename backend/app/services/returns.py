from sqlalchemy.orm import Session

from app.models.returns import Return
from app.schemas.returns import ReturnCreate
from app.services.returns_lot import process_return


def create_return(db: Session, return_data: ReturnCreate, current_user: dict | None = None):
    return process_return(
        db=db,
        dispatch_id=return_data.dispatch_id,
        items=return_data.products,
        observation=return_data.observation,
        user=current_user,
        tracking_number=return_data.tracking_number,
    )


def get_returns(db: Session):
    return db.query(Return).order_by(Return.created_at.desc()).all()
