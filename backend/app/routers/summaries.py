from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..schemas.summary import SummaryRead, SummaryWrite
from ..services import summary_service

router = APIRouter()


@router.post("/", response_model=SummaryRead)
async def create_or_update_summary(
    body: SummaryWrite,
    session: AsyncSession = Depends(get_db),
) -> SummaryRead:
    try:
        return await summary_service.upsert_summary(session, body)
    except ValueError as e:
        code = str(e)
        if code == "unit_not_found":
            raise HTTPException(status_code=400, detail=code) from e
        if code in ("summary_not_found", "unit_mismatch"):
            raise HTTPException(status_code=404, detail=code) from e
        raise HTTPException(status_code=400, detail=code) from e


@router.get("/{summary_id}", response_model=SummaryRead)
async def get_summary(
    summary_id: str,
    session: AsyncSession = Depends(get_db),
) -> SummaryRead:
    row = await summary_service.get_summary(session, summary_id)
    if row is None:
        raise HTTPException(status_code=404, detail="summary_not_found")
    return row
