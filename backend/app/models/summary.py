from datetime import datetime

from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel

from ..db_time import utcnow_naive


class Summary(SQLModel, table=True):
    __tablename__ = "summaries"

    id: str = Field(primary_key=True, max_length=36)
    unit_id: str = Field(foreign_key="units.id", max_length=36, index=True)
    source_text: str = Field(sa_column=Column(Text))
    user_summary: str = Field(sa_column=Column(Text))
    ai_feedback: str | None = Field(default=None, sa_column=Column(Text))
    structured_data: str | None = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=utcnow_naive)
    updated_at: datetime = Field(default_factory=utcnow_naive)
