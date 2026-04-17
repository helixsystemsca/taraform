from typing import Any

from pydantic import BaseModel, Field


class CoachRequest(BaseModel):
    source_text: str = Field(min_length=1, max_length=50_000)
    user_summary: str = Field(min_length=1, max_length=20_000)
    summary_id: str | None = Field(default=None, max_length=36)


class CoachResponse(BaseModel):
    missing_concepts: list[str] = Field(default_factory=list)
    unclear_points: list[str] = Field(default_factory=list)
    improvement_suggestions: list[str] = Field(default_factory=list)


class ImproveRequest(BaseModel):
    user_summary: str = Field(min_length=1, max_length=20_000)
    ai_feedback: dict[str, Any]


class ImproveResponse(BaseModel):
    improved_summary: str


class FlashcardsStubResponse(BaseModel):
    status: str = "not_implemented"
    message: str = "Flashcard generation will use cached summaries in a future release."
