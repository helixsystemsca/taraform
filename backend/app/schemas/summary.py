from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SummaryWrite(BaseModel):
    id: str | None = Field(default=None, max_length=36)
    unit_id: str = Field(max_length=36)
    source_text: str = Field(min_length=1, max_length=50_000)
    user_summary: str = Field(min_length=1, max_length=20_000)


class SummaryRead(BaseModel):
    id: str
    unit_id: str
    source_text: str
    user_summary: str
    ai_feedback: dict[str, Any] | None
    structured_data: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
