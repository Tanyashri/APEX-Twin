"""Add retraining and planning audit tables

Revision ID: 9a5f1234cdef
Revises: 4e196914928d
Create Date: 2026-10-13 10:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a5f1234cdef'
down_revision: Union[str, None] = '4e196914928d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'model_run',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('run_id', sa.String(), nullable=False),
        sa.Column('model_type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('trigger_type', sa.String(), nullable=False),
        sa.Column('dataset_version', sa.String(), nullable=True),
        sa.Column('num_samples', sa.Integer(), nullable=True),
        sa.Column('params_json', sa.JSON(), nullable=True),
        sa.Column('metrics_json', sa.JSON(), nullable=True),
        sa.Column('segment_metrics_json', sa.JSON(), nullable=True),
        sa.Column('logs', sa.String(), nullable=True),
        sa.Column('error', sa.String(), nullable=True),
        sa.Column('duration_s', sa.Float(), nullable=True),
        sa.Column('mlflow_run_id', sa.String(), nullable=True),
        sa.Column('artifact_path', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_model_run_run_id'), 'model_run', ['run_id'], unique=True)

    op.create_table(
        'model_artifact',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('version', sa.String(), nullable=False),
        sa.Column('run_id', sa.String(), nullable=True),
        sa.Column('model_type', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('artifact_path', sa.String(), nullable=True),
        sa.Column('metrics_summary_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('promoted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rolled_back_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['run_id'], ['model_run.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_model_artifact_version'), 'model_artifact', ['version'], unique=True)

    op.create_table(
        'model_promotion_audit',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('from_version', sa.String(), nullable=True),
        sa.Column('to_version', sa.String(), nullable=True),
        sa.Column('reason', sa.String(), nullable=True),
        sa.Column('actor', sa.String(), nullable=False),
        sa.Column('metrics_comparison_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'planning_audit_log',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('entity_id', sa.String(), nullable=True),
        sa.Column('parameter_name', sa.String(), nullable=False),
        sa.Column('old_value', sa.String(), nullable=True),
        sa.Column('new_value', sa.String(), nullable=False),
        sa.Column('actor', sa.String(), nullable=False),
        sa.Column('reason', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('planning_audit_log')
    op.drop_table('model_promotion_audit')
    op.drop_index(op.f('ix_model_artifact_version'), table_name='model_artifact')
    op.drop_table('model_artifact')
    op.drop_index(op.f('ix_model_run_run_id'), table_name='model_run')
    op.drop_table('model_run')
