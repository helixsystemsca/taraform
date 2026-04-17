import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.ai import (
    CoachRequest,
    CoachResponse,
    FlashcardsStubResponse,
    ImproveRequest,
    ImproveResponse,
)
from app.services import ai_service, summary_service

router = APIRouter()


def _feedback_from_row(raw: str | None) -> dict[str, Any] | None:
    if not raw or not raw.strip():
        return None
    try:
        v = json.loads(raw)
        return v if isinstance(v, dict) else None
    except json.JSONDecodeError:
        return None


@router.post("/coach", response_model=CoachResponse)
async def coach(body: CoachRequest, session: AsyncSession = Depends(get_db)) -> CoachResponse:
    if body.summary_id:
        row = await summary_service.get_summary_model(session, body.summary_id)
        if row is None:
            raise HTTPException(status_code=404, detail="summary_not_found")
        cached = _feedback_from_row(row.ai_feedback)
        if cached is not None:
            try:
                return CoachResponse.model_validate(
                    {
                        "missing_concepts": cached.get("missing_concepts") or [],
                        "unclear_points": cached.get("unclear_points") or [],
                        "improvement_suggestions": cached.get("improvement_suggestions") or [],
                    }
                )
            except Exception:  # noqa: BLE001
                pass
        await summary_service.touch_summary_text(
            session, body.summary_id, body.source_text, body.user_summary
        )

    try:
        result = await ai_service.run_coach(body.source_text, body.user_summary)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="ai_provider_error") from e

    if body.summary_id:
        await summary_service.save_ai_feedback(session, body.summary_id, result.model_dump())

    return result


@router.post("/improve", response_model=ImproveResponse)
async def improve(body: ImproveRequest) -> ImproveResponse:
    try:
        text = await ai_service.run_improve(body.user_summary, body.ai_feedback)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="ai_provider_error") from e
    return ImproveResponse(improved_summary=text)


@router.post("/flashcards", response_model=FlashcardsStubResponse)
async def flashcards_stub() -> FlashcardsStubResponse:
    return FlashcardsStubResponse()


@router.post("/quiz", response_model=FlashcardsStubResponse)
async def quiz_stub() -> FlashcardsStubResponse:
    return FlashcardsStubResponse(
        status="not_implemented",
        message="Quiz generation will use cached summaries in a future release.",
    )
