from typing import Any, Literal

from pydantic import BaseModel, Field


class HighlightRect(BaseModel):
    x: float
    y: float
    w: float
    h: float


class HighlightPayload(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    page: int = Field(ge=1)
    extracted_text: str = Field(min_length=1, max_length=50_000)
    rects: list[HighlightRect] = Field(min_length=1)
    color: str = Field(default="#fef08a", max_length=32)


class HighlightsBulkRequest(BaseModel):
    unit_id: str = Field(min_length=1, max_length=36)
    user_id: str | None = Field(default=None, max_length=36)
    highlights: list[HighlightPayload] = Field(default_factory=list)


class HighlightRead(BaseModel):
    id: str
    unit_id: str
    user_id: str | None
    page: int
    extracted_text: str
    normalized_text: str
    text_hash: str
    rects: list[HighlightRect]
    color: str
    created_at: Any


class GenerateStudyRequest(BaseModel):
    unit_id: str = Field(min_length=1, max_length=36)
    modes: list[Literal["flashcards", "quiz"]] = Field(min_length=1)
    highlight_ids: list[str] | None = Field(
        default=None,
        description="Subset of highlights; default = all highlights for unit",
    )
    force: bool = Field(default=False, description="Ignore generation cache and replace AI rows for requested modes")


class GenerateStudyResponse(BaseModel):
    flashcards_created: int = 0
    quiz_questions_created: int = 0
    skipped_flashcards: bool = False
    skipped_quiz: bool = False
    fingerprint: str | None = None


class FlashcardRead(BaseModel):
    id: str
    unit_id: str
    highlight_id: str | None
    question: str
    answer: str
    difficulty: str
    created_at: Any


class QuizQuestionRead(BaseModel):
    id: str
    unit_id: str
    highlight_id: str | None
    question: str
    options: list[str]
    correct_answer: str
    explanation: str
    question_type: str
    created_at: Any
