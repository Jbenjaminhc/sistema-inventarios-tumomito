"""add expiry date to batches

Revision ID: 3f8b1c4e9d2a
Revises: 2d23d6edf76e
Create Date: 2026-05-04 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = '3f8b1c4e9d2a'
down_revision = '2d23d6edf76e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('inventory_batches')]
    
    # Agregar la columna de expiry_date como sa.Date() si no existe
    if 'expiry_date' not in columns:
        op.add_column('inventory_batches', sa.Column('expiry_date', sa.Date(), nullable=True))
    else:
        # En caso de que se haya creado previamente como DateTime (desde la definición original), cambiar a Date()
        op.alter_column('inventory_batches', 'expiry_date',
                        existing_type=sa.DateTime(timezone=True),
                        type_=sa.Date(),
                        existing_nullable=True)


def downgrade() -> None:
    op.drop_column('inventory_batches', 'expiry_date')
