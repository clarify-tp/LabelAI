"""add OFF metadata columns to products and image_url to scans

Adds (Task 3B / 3F):
  products.packaging, products.manufacturing_places, products.origins,
  products.labels_tags, and scans.image_url.

All columns are nullable so the migration is backward-compatible.

Revision ID: b2c4e7f1a9d0
Revises: dadf1efc268d
Create Date: 2026-06-06
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c4e7f1a9d0'
down_revision = 'dadf1efc268d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('products', sa.Column('packaging', sa.String(length=200), nullable=True))
    op.add_column('products', sa.Column('manufacturing_places', sa.String(length=200), nullable=True))
    op.add_column('products', sa.Column('origins', sa.String(length=200), nullable=True))
    op.add_column('products', sa.Column('labels_tags', sa.String(length=500), nullable=True))
    op.add_column('scans', sa.Column('image_url', sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column('scans', 'image_url')
    op.drop_column('products', 'labels_tags')
    op.drop_column('products', 'origins')
    op.drop_column('products', 'manufacturing_places')
    op.drop_column('products', 'packaging')
