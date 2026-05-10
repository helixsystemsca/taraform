from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..schemas.study import (
    FlashcardRead,
    GenerateStudyRequest,
    GenerateStudyResponse,
    HighlightRead,
    HighlightsBulkRequest,
    QuizQuestionRead,
)
from ..services import study_generation_service, study_highlight_service

router = APIRouter()


@router.post("/highlights", response_model=list[HighlightRead])
async def upsert_highlights(
    body: HighlightsBulkRequest,
    session: AsyncSession = Depends(get_db),
) -> list[HighlightRead]:
    try:
        rows = await study_highlight_service.sync_highlights(session, body)
    except ValueError as e:
        if str(e) == "unit_not_found":
            raise HTTPException(status_code=404, detail="unit_not_found") from e
        raise HTTPException(status_code=400, detail=str(e)) from e
    return [study_highlight_service.highlight_to_read(r) for r in rows]


@router.get("/highlights", response_model=list[HighlightRead])
async def get_highlights(
    unit_id: str = Query(..., min_length=1, max_length=36),
    session: AsyncSession = Depends(get_db),
) -> list[HighlightRead]:
    ok = await study_highlight_service.ensure_unit(session, unit_id)
    if ok is None:
        raise HTTPException(status_code=404, detail="unit_not_found")
    rows = await study_highlight_service.list_highlights(session, unit_id)
    return [study_highlight_service.highlight_to_read(r) for r in rows]


@router.post("/generate", response_model=GenerateStudyResponse)
async def generate_study(
    body: GenerateStudyRequest,
    session: AsyncSession = Depends(get_db),
) -> GenerateStudyResponse:
    try:
        return await study_generation_service.run_study_generation(session, body)
    except ValueError as e:
        code = str(e)
        if code == "unit_not_found":
            raise HTTPException(status_code=404, detail="unit_not_found") from e
        if code in ("no_highlights", "no_highlight_text"):
            raise HTTPException(status_code=400, detail=code) from e
        raise HTTPException(status_code=400, detail=code) from e
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="ai_provider_error") from e


@router.get("/flashcards", response_model=list[FlashcardRead])
async def get_flashcards(
    unit_id: str = Query(..., min_length=1, max_length=36),
    session: AsyncSession = Depends(get_db),
) -> list[FlashcardRead]:
    ok = await study_highlight_service.ensure_unit(session, unit_id)
    if ok is None:
        raise HTTPException(status_code=404, detail="unit_not_found")
    raw = await study_generation_service.list_flashcards_read(session, unit_id)
    return [FlashcardRead.model_validate(x) for x in raw]


@router.get("/quizzes", response_model=list[QuizQuestionRead])
async def get_quizzes(
    unit_id: str = Query(..., min_length=1, max_length=36),
    session: AsyncSession = Depends(get_db),
) -> list[QuizQuestionRead]:
    ok = await study_highlight_service.ensure_unit(session, unit_id)
    if ok is None:
        raise HTTPException(status_code=404, detail="unit_not_found")
    raw = await study_generation_service.list_quiz_read(session, unit_id)
    return [QuizQuestionRead.model_validate(x) for x in raw]
