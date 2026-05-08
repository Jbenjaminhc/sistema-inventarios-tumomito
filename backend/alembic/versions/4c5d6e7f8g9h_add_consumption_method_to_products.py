"""add consumption method to products

Revision ID: 4c5d6e7f8g9h
Revises: 3f8b1c4e9d2a
Create Date: 2026-05-04 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = '4c5d6e7f8g9h'
down_revision = '3f8b1c4e9d2a'
branch_labels = None
depends_on = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('products')]
    
    if 'consumption_method' not in columns:
        op.add_column('products', sa.Column('consumption_method', sa.String(), server_default='PEPS', nullable=False))

def downgrade() -> None:
    op.drop_column('products', 'consumption_method')
