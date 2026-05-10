from datetime import datetime

from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel

from ..db_time import utcnow_naive


class StudyHighlight(SQLModel, table=True):
    __tablename__ = "study_highlights"

    id: str = Field(primary_key=True, max_length=36)
    unit_id: str = Field(foreign_key="units.id", max_length=36, index=True)
    user_id: str | None = Field(default=None, max_length=36, index=True)
    page: int = Field(ge=1)
    extracted_text: str = Field(sa_column=Column(Text))
    normalized_text: str = Field(sa_column=Column(Text))
    text_hash: str = Field(max_length=64, index=True)
    rects_json: str = Field(sa_column=Column(Text))
    color: str = Field(default="#fef08a", max_length=32)
    created_at: datetime = Field(default_factory=utcnow_naive)
