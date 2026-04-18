from datetime import datetime

from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel

from ..db_time import utcnow_naive


class Unit(SQLModel, table=True):
    __tablename__ = "units"

    id: str = Field(primary_key=True, max_length=36)
    title: str = Field(max_length=512)
    pdf_file_path: str = Field(sa_column=Column(Text))
    created_at: datetime = Field(default_factory=utcnow_naive)
