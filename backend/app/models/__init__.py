"""Modelos SQLAlchemy.

Este módulo importa todos los modelos para que Alembic los descubra
al generar migraciones.
"""

from app.models.base import Base  # noqa: F401

# Importar modelos (orden no crítico, pero mantenemos claridad)
from app.models.user import User  # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.inventory import Inventory  # noqa: F401
from app.models.transaction import Transaction  # noqa: F401
from app.models.dispatch import Dispatch  # noqa: F401
from app.models.returns import Return  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.supplier import Supplier  # noqa: F401
from app.models.purchase import PurchaseOrder, PurchaseItem  # noqa: F401
from app.models.batch import InventoryBatch, InventoryMovement  # noqa: F401
