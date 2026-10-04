"""add otp purpose

Revision ID: 61d5d7cf1902
Revises: 16604885bdb1
Create Date: 2026-10-05 01:49:17.476482

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '61d5d7cf1902'
down_revision: Union[str, Sequence[str], None] = '16604885bdb1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'email_verification_otps',
        sa.Column(
            'purpose',
            sa.String(),
            nullable=True
        )
    )

    op.execute(
        """
        UPDATE email_verification_otps
        SET purpose = 'email_verification'
        WHERE purpose IS NULL
        """
    )

    op.alter_column(
        'email_verification_otps',
        'purpose',
        nullable=False
    )


def downgrade() -> None:
    op.drop_column(
        'email_verification_otps',
        'purpose'
    )