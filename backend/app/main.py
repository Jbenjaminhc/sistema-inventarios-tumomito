from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.user import router as user_router
from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router
from app.routes.product import router as product_router
from app.routes.dispatch import router as dispatch_router
from app.routes.returns import router as return_router
from app.routes.inventory import router as inventory_router
from app.routes.transaction import router as transaction_router
from app.routes.category import router as category_router
from app.routes.audit_log import router as audit_log_router
from app.routes.supplier import router as supplier_router
from app.routes.purchase import router as purchase_router
from app.routes.batch import router as batch_router
from app.routes.fifo import router as fifo_router
from app.routes.report import router as report_router
from app.routes.alert import router as alert_router

import os

from app.core.database import Base, engine
import app.models  # noqa: F401  (carga todos los modelos)


app = FastAPI(title="TUMOMITO", version="1.0")


@app.on_event("startup")
def _startup():
    """Inicialización.

    Para desarrollo/demo, permite crear las tablas automáticamente si se define
    AUTO_CREATE_DB=true. En producción, se recomienda Alembic.
    """
    if os.getenv("AUTO_CREATE_DB", "false").lower() in {"1", "true", "yes"}:
        Base.metadata.create_all(bind=engine)

# Configuración de CORS
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000")
allow_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,  # usamos Bearer Token, no cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rutas con prefijo /api
app.include_router(user_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(product_router, prefix="/api")
app.include_router(dispatch_router, prefix="/api")
app.include_router(return_router, prefix="/api") 
app.include_router(inventory_router, prefix="/api")
app.include_router(transaction_router, prefix="/api")
app.include_router(category_router, prefix="/api")
app.include_router(audit_log_router, prefix="/api")
app.include_router(supplier_router, prefix="/api")
app.include_router(purchase_router, prefix="/api")
app.include_router(batch_router, prefix="/api")
app.include_router(fifo_router, prefix="/api")
app.include_router(report_router, prefix="/api")
app.include_router(alert_router, prefix="/api")

@app.get("/")
def home():
    return {"message": "Bienvenido a TUMOMITO"}
