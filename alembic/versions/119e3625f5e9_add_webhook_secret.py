"""add webhook secret

Revision ID: 119e3625f5e9
Revises: 210c5c9d943f
Create Date: 2026-10-04 20:48:42.794631
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import secrets


revision: str = '119e3625f5e9'
down_revision: Union[str, Sequence[str], None] = '210c5c9d943f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    op.add_column(
        'webhooks',
        sa.Column('secret', sa.String(), nullable=True)
    )

    connection = op.get_bind()

    result = connection.execute(
        sa.text("SELECT id FROM webhooks WHERE secret IS NULL")
    )

    for row in result:

        secret = "whsec_" + secrets.token_urlsafe(32)

        connection.execute(
            sa.text(
                "UPDATE webhooks SET secret = :secret WHERE id = :id"
            ),
            {
                "secret": secret,
                "id": row.id
            }
        )

    op.alter_column(
        'webhooks',
        'secret',
        nullable=False
    )

    op.create_unique_constraint(
        'uq_webhooks_secret',
        'webhooks',
        ['secret']
    )


def downgrade() -> None:

    op.drop_constraint(
        'uq_webhooks_secret',
        'webhooks',
        type_='unique'
    )

    op.drop_column(
        'webhooks',
        'secret'
    )