from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest
from datetime import date, timedelta

from app.main import app
from app.core.database import Base, get_db
from app.core.security import create_access_token

# Setup in-memory sqlite db for tests
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
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture()
def admin_token():
    # Return a valid admin token (mock or create via security module)
    # Assuming user ID 1 is admin
    access_token = create_access_token(data={"sub": "1"})
    return {"Authorization": f"Bearer {access_token}"}

def test_peps_fefo_coexistence(test_db, admin_token):
    # 1. Crear categoría
    resp = client.post("/api/categories/", json={"name": "Test Cat"}, headers=admin_token)
    assert resp.status_code == 200
    cat_id = resp.json()["id"]

    # 2. Crear dos productos, uno PEPS y otro FEFO
    prod_peps = client.post("/api/products/", json={
        "code": "PEPS-001",
        "name": "Producto PEPS",
        "price": 10.0,
        "stock": 0,
        "category_id": cat_id,
        "consumption_method": "PEPS"
    }, headers=admin_token).json()

    prod_fefo = client.post("/api/products/", json={
        "code": "FEFO-001",
        "name": "Producto FEFO",
        "price": 20.0,
        "stock": 0,
        "category_id": cat_id,
        "consumption_method": "PEPS" # Creamos PEPS primero y luego cambiamos a FEFO para probar la validacion
    }, headers=admin_token).json()

    peps_id = prod_peps["id"]
    fefo_id = prod_fefo["id"]

    # 3. Recibir orden de compra para meter lotes
    # Lote 1 para PEPS (Vence en 10 dias)
    # Lote 2 para PEPS (Vence en 5 dias)
    # Lote 1 para FEFO (Vence en 10 dias)
    # Lote 2 para FEFO (Vence en 5 dias)
    
    # Creamos proveedor
    supp = client.post("/api/suppliers/", json={"name": "Prov"}, headers=admin_token).json()
    
    today = date.today()
    d10 = (today + timedelta(days=10)).isoformat()
    d5 = (today + timedelta(days=5)).isoformat()
    
    # Orden de PEPS
    client.post("/api/inventory/adjustments/increase", json={
        "product_id": peps_id,
        "quantity": 10,
        "unit_cost": 5.0
    }, headers=admin_token) # No expiry
    
    # Agregamos directo a base de datos usando el endpoint de purchase order... es mejor hacer inserts o usar increase
    # Para poder meter expiry_date, usaremos el endpoint de orders y receive.
    
    po_peps = client.post("/api/purchase-orders/", json={
        "supplier_id": supp["id"],
        "expected_date": today.isoformat(),
        "items": [
            {"product_id": peps_id, "quantity": 10, "unit_cost": 5.0},
            {"product_id": peps_id, "quantity": 10, "unit_cost": 6.0}
        ]
    }, headers=admin_token).json()

    # Receive
    client.post(f"/api/purchase-orders/{po_peps['id']}/receive", json={
        "items": [
            {"purchase_item_id": po_peps["items"][0]["id"], "expiry_date": d10},
            {"purchase_item_id": po_peps["items"][1]["id"], "expiry_date": d5}
        ]
    }, headers=admin_token)

    po_fefo = client.post("/api/purchase-orders/", json={
        "supplier_id": supp["id"],
        "expected_date": today.isoformat(),
        "items": [
            {"product_id": fefo_id, "quantity": 10, "unit_cost": 5.0},
            {"product_id": fefo_id, "quantity": 10, "unit_cost": 6.0}
        ]
    }, headers=admin_token).json()

    client.post(f"/api/purchase-orders/{po_fefo['id']}/receive", json={
        "items": [
            {"purchase_item_id": po_fefo["items"][0]["id"], "expiry_date": d10},
            {"purchase_item_id": po_fefo["items"][1]["id"], "expiry_date": d5}
        ]
    }, headers=admin_token)

    # Ahora cambiamos a FEFO (el producto FEFO)
    client.patch(f"/api/products/{fefo_id}/consumption-method", json={"method": "FEFO"}, headers=admin_token)

    # 4. Consumir PEPS (Debería salir el de d10 primero porque fue la primera linea recibida)
    # 5. Consumir FEFO (Debería salir el de d5 primero porque vence primero)
    
    res_peps = client.post("/api/fifo/consume", json={
        "product_id": peps_id,
        "quantity": 5,
        "reference_type": "test",
        "reference_id": 1
    }, headers=admin_token).json()
    assert res_peps["consumed_quantity"] == 5
    assert res_peps["total_cost"] == 25.0 # (5 * 5.0, Lote 1)

    res_fefo = client.post("/api/fefo/consume", json={
        "product_id": fefo_id,
        "quantity": 5,
        "reference_type": "test",
        "reference_id": 1
    }, headers=admin_token).json()
    assert res_fefo["consumed_quantity"] == 5
    assert res_fefo["total_cost"] == 30.0 # (5 * 6.0, Lote 2 porque vence primero d5 < d10)

    print("Test passed: PEPS and FEFO coexist perfectly")

