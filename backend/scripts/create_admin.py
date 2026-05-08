"""Crea un usuario administrador inicial.

Uso:
  python -m scripts.create_admin

Nota:
 - No crea el admin si ya existe algún usuario.
 - La configuración de DB se toma del backend/.env.
"""

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User


def create_admin() -> None:
    db = SessionLocal()
    try:
        # Evitar duplicados: si ya existe al menos un usuario, no creamos admin.
        if db.query(User).first():
            print("❌ Ya existe al menos un usuario. No se crea admin.")
            return

        admin = User(
            username="admin",
            password_hash=hash_password("Admin123*"),
            role="admin",
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("✅ Usuario admin creado")
        print("Usuario: admin")
        print("Password: Admin123*")
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
