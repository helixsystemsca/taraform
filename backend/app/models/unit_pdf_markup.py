from datetime import datetime, timezone

from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UnitPdfMarkup(SQLModel, table=True):
    """JSON payload: strokes_by_page, text_highlights (client-owned schema)."""

    __tablename__ = "unit_pdf_markups"

    unit_id: str = Field(primary_key=True, max_length=36, foreign_key="units.id")
    payload_json: str = Field(sa_column=Column(Text))
    updated_at: datetime = Field(default_factory=utcnow)
