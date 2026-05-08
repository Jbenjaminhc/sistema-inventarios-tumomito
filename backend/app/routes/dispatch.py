from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.dispatch import DispatchCreate, DispatchResponse, DispatchOrder, DispatchProduct
from app.services.dispatch import create_dispatch, get_dispatches
from app.models.dispatch import Dispatch
import json

router = APIRouter(prefix="/dispatches", tags=["Dispatches"])

# Crear una nueva orden de despacho
@router.post("/", response_model=DispatchResponse)
def create_new_dispatch(
    dispatch_data: DispatchCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        new_dispatch = create_dispatch(db, dispatch_data, current_user)

        return DispatchResponse(
            id=new_dispatch.id,
            order_number=new_dispatch.order_number,
            tracking_number=new_dispatch.tracking_number,
            created_by=new_dispatch.created_by,
            created_at=new_dispatch.created_at.isoformat(),
            carrier=new_dispatch.carrier,
            products=[DispatchProduct(**item) for item in json.loads(new_dispatch.products_json)]
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# Obtener todas las órdenes de despacho con filtros opcionales
@router.get("/", response_model=List[DispatchOrder])
def list_dispatches(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    query: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    tracking_number: Optional[str] = None,
):
    return get_dispatches(
        db=db,
        query=query,
        start_date=start_date,
        end_date=end_date,
        tracking_number=tracking_number,
    )

@router.get("/{dispatch_id}", response_model=DispatchResponse)
def get_dispatch_by_id(
    dispatch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from app.models.dispatch import Dispatch
    from app.models.product import Product

    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Despacho no encontrado.")

    products_raw = json.loads(dispatch.products_json)
    full_products = []

    for item in products_raw:
        if "code" in item and "name" in item:
            full_products.append(item)
        else:
            # 🔍 Cargar datos del producto desde la DB
            product = db.query(Product).filter(Product.id == item["product_id"]).first()
            full_products.append({
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "code": product.code if product else "N/A",
                "name": product.name if product else "Desconocido",
            })

    return DispatchResponse(
        id=dispatch.id,
        order_number=dispatch.order_number,
        tracking_number=dispatch.tracking_number,
        created_by=dispatch.created_by,
        created_at=dispatch.created_at.isoformat(),
        products=[DispatchProduct(**p) for p in full_products]
    )
