"""add_verdict_text_to_scans_if_missing

Revision ID: c3d1e2f4b5a6
Revises: a260cafcc1af
Create Date: 2025-06-09

Ensures the verdict_text column exists on the scans table.
The model already declares it; this migration handles DBs that were
created before the column was added.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.exc import OperationalError


# revision identifiers, used by Alembic.
revision = 'c3d1e2f4b5a6'
down_revision = 'a260cafcc1af'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('scans')]
    if 'verdict_text' not in columns:
        op.add_column('scans', sa.Column('verdict_text', sa.Text(), nullable=True))


def downgrade():
    try:
        op.drop_column('scans', 'verdict_text')
    except OperationalError:
        pass   # column didn't exist — no-op
