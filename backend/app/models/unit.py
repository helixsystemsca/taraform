from datetime import datetime, timezone

from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Unit(SQLModel, table=True):
    __tablename__ = "units"

    id: str = Field(primary_key=True, max_length=36)
    title: str = Field(max_length=512)
    pdf_file_path: str = Field(sa_column=Column(Text))
    created_at: datetime = Field(default_factory=utcnow)
