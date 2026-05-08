from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest
from datetime import date, timedelta

from app.main import app
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.models.product import Product
from app.models.batch import InventoryBatch

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
    yield TestingSessionLocal()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture()
def admin_token():
    access_token = create_access_token(data={"sub": "admin@test.com", "role": "admin"})
    return {"Authorization": f"Bearer {access_token}"}

def test_block_expired_lots(test_db, admin_token):
    from app.models.user import User
    from app.core.security import hash_password
    db = test_db
    
    # Crear usuario admin
    admin = User(id=1, username="admin@test.com", password_hash=hash_password("password"), role="admin")
    db.add(admin)
    
    # 1. Crear producto PEPS y producto FEFO directamente en BD para el test
    from app.models.category import Category
    
    cat = Category(name="Test Cat")
    db.add(cat)
    db.flush()

    p_peps = Product(code="TEST-PEPS", name="PEPS Product", price=10, stock=0, category_id=cat.id, consumption_method="PEPS")
    p_fefo = Product(code="TEST-FEFO", name="FEFO Product", price=10, stock=0, category_id=cat.id, consumption_method="FEFO")
    db.add_all([p_peps, p_fefo])
    db.commit()
    db.refresh(p_peps)
    db.refresh(p_fefo)
    
    today = date.today()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)
    
    # Crear lotes directamente en DB para facilitar test
    b1 = InventoryBatch(product_id=p_peps.id, quantity=10, remaining_quantity=10, unit_cost=5.0, expiry_date=yesterday) # Vencido
    b2 = InventoryBatch(product_id=p_peps.id, quantity=10, remaining_quantity=10, unit_cost=5.0, expiry_date=tomorrow) # Valido
    db.add_all([b1, b2])
    
    b3 = InventoryBatch(product_id=p_fefo.id, quantity=10, remaining_quantity=10, unit_cost=5.0, expiry_date=yesterday) # Vencido
    b4 = InventoryBatch(product_id=p_fefo.id, quantity=10, remaining_quantity=10, unit_cost=5.0, expiry_date=tomorrow) # Valido
    db.add_all([b3, b4])
    db.commit()
    
    from app.services.batch import recalculate_product_stock
    recalculate_product_stock(db, p_peps.id)
    recalculate_product_stock(db, p_fefo.id)
    db.commit()
    
    # Update FEFO product
    client.patch(f"/api/products/{p_fefo.id}/consumption-method", json={"method": "FEFO"}, headers=admin_token)
    
    # Casos de prueba:
    # 1. Intentar despachar lote vencido (PEPS tomará el b1 que es el más viejo) -> debe fallar
    res_peps = client.post("/api/dispatches/", json={
        "order_number": "ORD-001",
        "tracking_number": "TRK-001",
        "carrier": "Test",
        "created_by": "admin",
        "products": [{"product_id": p_peps.id, "quantity": 5}]
    }, headers=admin_token)
    assert res_peps.status_code == 400
    assert "uno de sus lotes está vencido" in res_peps.json()["detail"].lower()
    
    # 2. FEFO debe saltar lotes vencidos y usar el siguiente válido
    res_fefo = client.post("/api/dispatches/", json={
        "order_number": "ORD-002",
        "tracking_number": "TRK-002",
        "carrier": "Test",
        "created_by": "admin",
        "products": [{"product_id": p_fefo.id, "quantity": 5}]
    }, headers=admin_token)
    assert res_fefo.status_code == 200 # Porque FEFO saltó el vencido y consumió el b4
    db.refresh(b4)
    assert b4.remaining_quantity == 5
    
    # 3. Ajuste negativo con lote vencido -> debe fallar (PEPS)
    res_adj = client.post("/api/inventory/adjustments/decrease", json={
        "product_id": p_peps.id, "quantity": 5
    }, headers=admin_token)
    assert res_adj.status_code == 400
    assert "lotes seleccionados por el motor está vencido" in res_adj.json()["detail"].lower()
