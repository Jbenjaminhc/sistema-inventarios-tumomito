from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.dispatch import Dispatch
from app.models.returns import Return
from app.schemas.returns import ReturnCreate, ReturnResponse, ReturnDispatchResponse, ReturnLotProductOut
from app.services.returns import create_return, get_returns
from app.services.returns_lot import get_dispatch_return_items

router = APIRouter(prefix="/returns", tags=["Returns"])


def _normalize_return_item(item: dict) -> dict:
    product_name = item.get("product_name") or item.get("name") or "Desconocido"
    code = item.get("code") or "N/A"
    quantity_returned = item.get("quantity_returned")
    if quantity_returned is None:
        quantity_returned = item.get("quantity") or 0

    unit_cost = float(item.get("unit_cost") or 0.0)
    total_cost = item.get("total_cost")
    if total_cost is None:
        total_cost = float(quantity_returned) * unit_cost

    return {
        "product_id": item.get("product_id") or 0,
        "product_name": product_name,
        "code": code,
        "batch_id": item.get("batch_id") or 0,
        "batch_expiry": item.get("batch_expiry"),
        "unit_cost": unit_cost,
        "quantity_despached": item.get("quantity_despached") or item.get("quantity") or quantity_returned,
        "quantity_returned": quantity_returned,
        "total_cost": total_cost,
        "movement_reference": item.get("movement_reference"),
    }


@router.post("/", response_model=ReturnResponse)
def register_return(
    data: ReturnCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return create_return(db, data, current_user)


@router.get("/", response_model=List[ReturnResponse])
def list_returns(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    results = get_returns(db)
    for r in results:
        r.products = [ReturnLotProductOut(**_normalize_return_item(item)) for item in json.loads(r.products_json)]
    return results


@router.get("/{identifier}", response_model=ReturnDispatchResponse)
def get_dispatch_by_tracking_number(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    dispatch_query = db.query(Dispatch)
    dispatch = None
    if identifier.isdigit():
        dispatch = dispatch_query.filter(Dispatch.id == int(identifier)).first()
    if not dispatch:
        dispatch = (
            dispatch_query
            .filter((Dispatch.tracking_number == identifier) | (Dispatch.order_number == identifier))
            .first()
        )

    if not dispatch:
        raise HTTPException(status_code=404, detail="No se encontró despacho asociado a esa guía u orden.")

    products_response = get_dispatch_return_items(db, dispatch)

    return {
        "dispatch_id": dispatch.id,
        "order_number": dispatch.order_number,
        "tracking_number": dispatch.tracking_number,
        "carrier": dispatch.carrier,
        "products": products_response
    }


