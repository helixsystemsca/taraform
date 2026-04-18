from datetime import datetime

from pydantic import BaseModel, Field


class StickyNoteRead(BaseModel):
    id: str
    unit_id: str
    page_number: int = Field(ge=1)
    x_position: float
    y_position: float
    content: str
    created_at: datetime


class StickyNoteCreate(BaseModel):
    page_number: int = Field(ge=1)
    x_position: float
    y_position: float
    content: str = ""


class StickyNoteUpdate(BaseModel):
    page_number: int | None = Field(default=None, ge=1)
    x_position: float | None = None
    y_position: float | None = None
    content: str | None = None
