from datetime import datetime

from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel

from ..db_time import utcnow_naive


class StudyFlashcard(SQLModel, table=True):
    __tablename__ = "study_flashcards"

    id: str = Field(primary_key=True, max_length=36)
    unit_id: str = Field(foreign_key="units.id", max_length=36, index=True)
    highlight_id: str | None = Field(
        default=None,
        foreign_key="study_highlights.id",
        max_length=36,
        index=True,
    )
    question: str = Field(sa_column=Column(Text))
    answer: str = Field(sa_column=Column(Text))
    difficulty: str = Field(default="medium", max_length=32)
    created_at: datetime = Field(default_factory=utcnow_naive)
