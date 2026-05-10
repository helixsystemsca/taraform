from datetime import datetime

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel

from ..db_time import utcnow_naive


class StudyGenerationCache(SQLModel, table=True):
    """Avoids duplicate LLM calls when highlight fingerprint unchanged."""

    __tablename__ = "study_generation_cache"
    __table_args__ = (
        UniqueConstraint("unit_id", "kind", "fingerprint", name="uq_study_gen_unit_kind_fp"),
    )

    id: str = Field(primary_key=True, max_length=36)
    unit_id: str = Field(foreign_key="units.id", max_length=36, index=True)
    kind: str = Field(max_length=32, index=True)
    fingerprint: str = Field(max_length=64, index=True)
    created_at: datetime = Field(default_factory=utcnow_naive)
