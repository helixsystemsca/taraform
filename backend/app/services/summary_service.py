import json
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ..db_time import utcnow_naive
from ..models.summary import Summary
from ..models.unit import Unit
from ..schemas.summary import SummaryRead, SummaryWrite


def _parse_json_field(raw: str | None) -> dict[str, Any] | None:
    if not raw:
        return None
    try:
        v = json.loads(raw)
        return v if isinstance(v, dict) else None
    except json.JSONDecodeError:
        return None


def summary_to_read(row: Summary) -> SummaryRead:
    return SummaryRead(
        id=row.id,
        unit_id=row.unit_id,
        source_text=row.source_text,
        user_summary=row.user_summary,
        ai_feedback=_parse_json_field(row.ai_feedback),
        structured_data=_parse_json_field(row.structured_data),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def ensure_unit_exists(session: AsyncSession, unit_id: str) -> bool:
    u = await session.get(Unit, unit_id)
    return u is not None


async def upsert_summary(session: AsyncSession, body: SummaryWrite) -> SummaryRead:
    if not await ensure_unit_exists(session, body.unit_id):
        raise ValueError("unit_not_found")

    now = utcnow_naive()
    if body.id:
        row = await session.get(Summary, body.id)
        if row is None:
            raise ValueError("summary_not_found")
        if row.unit_id != body.unit_id:
            raise ValueError("unit_mismatch")
        if row.source_text != body.source_text or row.user_summary != body.user_summary:
            row.ai_feedback = None
        row.source_text = body.source_text
        row.user_summary = body.user_summary
        row.updated_at = now
        session.add(row)
        await session.commit()
        await session.refresh(row)
        return summary_to_read(row)

    row = Summary(
        id=str(uuid.uuid4()),
        unit_id=body.unit_id,
        source_text=body.source_text,
        user_summary=body.user_summary,
        ai_feedback=None,
        structured_data=None,
        created_at=now,
        updated_at=now,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return summary_to_read(row)


async def get_summary(session: AsyncSession, summary_id: str) -> SummaryRead | None:
    row = await session.get(Summary, summary_id)
    return summary_to_read(row) if row else None


async def get_summary_model(session: AsyncSession, summary_id: str) -> Summary | None:
    return await session.get(Summary, summary_id)


async def save_ai_feedback(session: AsyncSession, summary_id: str, feedback: dict[str, Any]) -> None:
    row = await session.get(Summary, summary_id)
    if row is None:
        raise ValueError("summary_not_found")
    row.ai_feedback = json.dumps(feedback, ensure_ascii=False)
    row.updated_at = utcnow_naive()
    session.add(row)
    await session.commit()


async def touch_summary_text(
    session: AsyncSession, summary_id: str, source_text: str, user_summary: str
) -> None:
    row = await session.get(Summary, summary_id)
    if row is None:
        raise ValueError("summary_not_found")
    row.source_text = source_text
    row.user_summary = user_summary
    row.updated_at = utcnow_naive()
    session.add(row)
    await session.commit()
