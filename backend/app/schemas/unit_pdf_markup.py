from datetime import datetime

from pydantic import BaseModel


class UnitPdfMarkupRead(BaseModel):
    unit_id: str
    payload: dict
    updated_at: datetime


class UnitPdfMarkupWrite(BaseModel):
    payload: dict
