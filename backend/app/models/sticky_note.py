from datetime import datetime

from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel

from ..db_time import utcnow_naive


class StickyNote(SQLModel, table=True):
    __tablename__ = "sticky_notes"

    id: str = Field(primary_key=True, max_length=36)
    unit_id: str = Field(foreign_key="units.id", max_length=36, index=True)
    page_number: int = Field(ge=1)
    x_position: float = Field()
    y_position: float = Field()
    content: str = Field(default="", sa_column=Column(Text))
    created_at: datetime = Field(default_factory=utcnow_naive)
