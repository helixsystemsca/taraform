from datetime import datetime

from pydantic import BaseModel, Field


class UnitCreateResponse(BaseModel):
    id: str
    title: str
    pdf_file_path: str
    created_at: datetime
    text_preview: str = Field(description="First pages of extracted text (not full document).")
