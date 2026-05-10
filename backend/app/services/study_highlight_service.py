import json

from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..models.study_flashcard import StudyFlashcard
from ..models.study_highlight import StudyHighlight
from ..models.study_quiz_question import StudyQuizQuestion
from ..models.unit import Unit
from ..schemas.study import HighlightRead, HighlightsBulkRequest
from .study_highlight_util import compute_text_hash, normalize_highlight_text


async def ensure_unit(session: AsyncSession, unit_id: str) -> Unit | None:
    return await session.get(Unit, unit_id)


async def sync_highlights(session: AsyncSession, body: HighlightsBulkRequest) -> list[StudyHighlight]:
    unit = await ensure_unit(session, body.unit_id)
    if unit is None:
        raise ValueError("unit_not_found")

    res = await session.execute(select(StudyHighlight).where(StudyHighlight.unit_id == body.unit_id))
    existing = list(res.scalars().all())
    existing_ids = {h.id for h in existing}
    payload_ids = {h.id for h in body.highlights}
    to_remove = existing_ids - payload_ids

    if to_remove:
        await session.execute(
            update(StudyFlashcard)
            .where(StudyFlashcard.highlight_id.in_(to_remove))
            .values(highlight_id=None),
        )
        await session.execute(
            update(StudyQuizQuestion)
            .where(StudyQuizQuestion.highlight_id.in_(to_remove))
            .values(highlight_id=None),
        )
        await session.execute(delete(StudyHighlight).where(StudyHighlight.id.in_(to_remove)))

    for hp in body.highlights:
        norm = normalize_highlight_text(hp.extracted_text)
        th = compute_text_hash(hp.extracted_text)
        rects_json = json.dumps([r.model_dump() for r in hp.rects], ensure_ascii=False)
        row = await session.get(StudyHighlight, hp.id)
        if row:
            row.page = hp.page
            row.extracted_text = hp.extracted_text.strip()
            row.normalized_text = norm
            row.text_hash = th
            row.rects_json = rects_json
            row.color = hp.color
            if body.user_id is not None:
                row.user_id = body.user_id
            session.add(row)
        else:
            session.add(
                StudyHighlight(
                    id=hp.id,
                    unit_id=body.unit_id,
                    user_id=body.user_id,
                    page=hp.page,
                    extracted_text=hp.extracted_text.strip(),
                    normalized_text=norm,
                    text_hash=th,
                    rects_json=rects_json,
                    color=hp.color,
                ),
            )

    await session.commit()

    res2 = await session.execute(
        select(StudyHighlight).where(StudyHighlight.unit_id == body.unit_id).order_by(StudyHighlight.page),
    )
    return list(res2.scalars().all())


def highlight_to_read(row: StudyHighlight) -> HighlightRead:
    try:
        raw = json.loads(row.rects_json)
        rects = [r for r in raw if isinstance(r, dict)] if isinstance(raw, list) else []
    except json.JSONDecodeError:
        rects = []
    from ..schemas.study import HighlightRect

    safe_rects = []
    for r in rects:
        try:
            safe_rects.append(HighlightRect(x=float(r["x"]), y=float(r["y"]), w=float(r["w"]), h=float(r["h"])))
        except (KeyError, TypeError, ValueError):
            continue

    return HighlightRead(
        id=row.id,
        unit_id=row.unit_id,
        user_id=row.user_id,
        page=row.page,
        extracted_text=row.extracted_text,
        normalized_text=row.normalized_text,
        text_hash=row.text_hash,
        rects=safe_rects,
        color=row.color,
        created_at=row.created_at,
    )


async def list_highlights(session: AsyncSession, unit_id: str) -> list[StudyHighlight]:
    res = await session.execute(
        select(StudyHighlight).where(StudyHighlight.unit_id == unit_id).order_by(StudyHighlight.page),
    )
    return list(res.scalars().all())
