from datetime import date, timedelta
import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.batch import InventoryBatch, InventoryMovement
from app.models.category import Category
from app.models.dispatch import Dispatch
from app.models.product import Product
from app.models.user import User

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture()
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def admin_token():
    access_token = create_access_token(data={"sub": "admin@test.com", "role": "admin"})
    return {"Authorization": f"Bearer {access_token}"}


def _seed_user(db):
    admin = User(id=1, username="admin@test.com", password_hash=hash_password("password"), role="admin")
    db.add(admin)
    db.commit()


def _seed_dispatch_with_batch(db, *, tracking_number: str, order_number: str, batch_expiry: date):
    category = Category(name="Test Category")
    db.add(category)
    db.flush()

    product = Product(
        code=f"PROD-{tracking_number}",
        name=f"Producto {tracking_number}",
        description="Producto de prueba",
        price=10.0,
        stock=6,
        category_id=category.id,
        consumption_method="PEPS",
    )
    db.add(product)
    db.flush()

    batch = InventoryBatch(
        product_id=product.id,
        quantity=10,
        remaining_quantity=6,
        unit_cost=5.0,
        expiry_date=batch_expiry,
    )
    db.add(batch)
    db.flush()

    dispatch = Dispatch(
        order_number=order_number,
        tracking_number=tracking_number,
        carrier="Carrier Test",
        created_by="admin@test.com",
        products_json=json.dumps([
            {
                "product_id": product.id,
                "code": product.code,
                "name": product.name,
                "quantity": 4,
                "batch_allocations": [
                    {
                        "batch_id": batch.id,
                        "batch_expiry": batch_expiry.isoformat(),
                        "unit_cost": 5.0,
                        "quantity_despached": 4,
                    }
                ],
            }
        ]),
    )
    db.add(dispatch)
    db.commit()
    db.refresh(batch)
    db.refresh(dispatch)
    return product, batch, dispatch


def test_return_by_lot_updates_batch_and_creates_return_movement(test_db, admin_token):
    db = test_db
    _seed_user(db)
    tomorrow = date.today() + timedelta(days=1)
    product, batch, dispatch = _seed_dispatch_with_batch(
        db,
        tracking_number="TRK-LOT-001",
        order_number="ORD-LOT-001",
        batch_expiry=tomorrow,
    )

    search = client.get(f"/api/returns/{dispatch.tracking_number}", headers=admin_token)
    assert search.status_code == 200
    search_data = search.json()
    assert search_data["dispatch_id"] == dispatch.id
    assert search_data["products"][0]["batch_id"] == batch.id
    assert search_data["products"][0]["quantity_despached"] == 4

    response = client.post(
        "/api/returns/",
        json={
            "dispatch_id": dispatch.id,
            "tracking_number": dispatch.tracking_number,
            "observation": "Retorno parcial",
            "products": [
                {
                    "product_id": product.id,
                    "batch_id": batch.id,
                    "quantity": 2,
                }
            ],
        },
        headers=admin_token,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tracking_number"] == dispatch.tracking_number
    assert data["products"][0]["movement_reference"] == f"RETURN-{data['id']}"
    assert data["products"][0]["quantity_returned"] == 2

    db.refresh(batch)
    db.refresh(product)
    assert batch.remaining_quantity == 8
    assert product.stock == 8

    movement = db.query(InventoryMovement).filter_by(reference_type="RETURN", reference_id=data["id"]).first()
    assert movement is not None
    assert movement.movement_type == "RETURN"
    assert movement.batch_id == batch.id
    assert movement.quantity == 2
    assert movement.unit_cost == 5.0

    history = client.get("/api/returns/", headers=admin_token)
    assert history.status_code == 200
    history_data = history.json()
    assert history_data[0]["products"][0]["batch_id"] == batch.id
    assert history_data[0]["products"][0]["quantity_returned"] == 2


def test_return_blocked_for_expired_batch(test_db, admin_token):
    db = test_db
    _seed_user(db)
    yesterday = date.today() - timedelta(days=1)
    product, batch, dispatch = _seed_dispatch_with_batch(
        db,
        tracking_number="TRK-LOT-002",
        order_number="ORD-LOT-002",
        batch_expiry=yesterday,
    )

    response = client.post(
        "/api/returns/",
        json={
            "dispatch_id": dispatch.id,
            "tracking_number": dispatch.tracking_number,
            "observation": "Intento de retorno vencido",
            "products": [
                {
                    "product_id": product.id,
                    "batch_id": batch.id,
                    "quantity": 1,
                }
            ],
        },
        headers=admin_token,
    )
    assert response.status_code == 400
    assert "No se puede devolver un lote vencido" in response.json()["detail"]
