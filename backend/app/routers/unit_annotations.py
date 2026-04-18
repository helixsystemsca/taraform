import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..db.database import get_db
from ..models.sticky_note import StickyNote
from ..models.unit import Unit
from ..models.unit_pdf_markup import UnitPdfMarkup
from ..schemas.sticky_note import StickyNoteCreate, StickyNoteRead, StickyNoteUpdate
from ..schemas.unit_pdf_markup import UnitPdfMarkupRead, UnitPdfMarkupWrite

router = APIRouter()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _require_unit(session: AsyncSession, unit_id: str) -> Unit:
    u = await session.get(Unit, unit_id)
    if not u:
        raise HTTPException(status_code=404, detail="unit_not_found")
    return u


@router.get("/{unit_id}/sticky-notes", response_model=list[StickyNoteRead])
async def list_sticky_notes(
    unit_id: str,
    session: AsyncSession = Depends(get_db),
) -> list[StickyNoteRead]:
    await _require_unit(session, unit_id)
    res = await session.execute(
        select(StickyNote).where(StickyNote.unit_id == unit_id).order_by(StickyNote.created_at),
    )
    rows = list(res.scalars().all())
    return [
        StickyNoteRead(
            id=r.id,
            unit_id=r.unit_id,
            page_number=r.page_number,
            x_position=r.x_position,
            y_position=r.y_position,
            content=r.content,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("/{unit_id}/sticky-notes", response_model=StickyNoteRead)
async def create_sticky_note(
    unit_id: str,
    body: StickyNoteCreate,
    session: AsyncSession = Depends(get_db),
) -> StickyNoteRead:
    await _require_unit(session, unit_id)
    nid = str(uuid.uuid4())
    row = StickyNote(
        id=nid,
        unit_id=unit_id,
        page_number=body.page_number,
        x_position=body.x_position,
        y_position=body.y_position,
        content=body.content,
        created_at=utcnow(),
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return StickyNoteRead(
        id=row.id,
        unit_id=row.unit_id,
        page_number=row.page_number,
        x_position=row.x_position,
        y_position=row.y_position,
        content=row.content,
        created_at=row.created_at,
    )


@router.patch("/{unit_id}/sticky-notes/{note_id}", response_model=StickyNoteRead)
async def update_sticky_note(
    unit_id: str,
    note_id: str,
    body: StickyNoteUpdate,
    session: AsyncSession = Depends(get_db),
) -> StickyNoteRead:
    await _require_unit(session, unit_id)
    row = await session.get(StickyNote, note_id)
    if not row or row.unit_id != unit_id:
        raise HTTPException(status_code=404, detail="sticky_note_not_found")
    if body.page_number is not None:
        row.page_number = body.page_number
    if body.x_position is not None:
        row.x_position = body.x_position
    if body.y_position is not None:
        row.y_position = body.y_position
    if body.content is not None:
        row.content = body.content
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return StickyNoteRead(
        id=row.id,
        unit_id=row.unit_id,
        page_number=row.page_number,
        x_position=row.x_position,
        y_position=row.y_position,
        content=row.content,
        created_at=row.created_at,
    )


@router.delete("/{unit_id}/sticky-notes/{note_id}")
async def delete_sticky_note(
    unit_id: str,
    note_id: str,
    session: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    await _require_unit(session, unit_id)
    row = await session.get(StickyNote, note_id)
    if not row or row.unit_id != unit_id:
        raise HTTPException(status_code=404, detail="sticky_note_not_found")
    await session.delete(row)
    await session.commit()
    return {"status": "ok"}


@router.get("/{unit_id}/pdf-markup", response_model=UnitPdfMarkupRead)
async def get_pdf_markup(unit_id: str, session: AsyncSession = Depends(get_db)) -> UnitPdfMarkupRead:
    await _require_unit(session, unit_id)
    row = await session.get(UnitPdfMarkup, unit_id)
    if not row:
        return UnitPdfMarkupRead(unit_id=unit_id, payload={}, updated_at=utcnow())
    try:
        payload = json.loads(row.payload_json) if row.payload_json else {}
    except json.JSONDecodeError:
        payload = {}
    return UnitPdfMarkupRead(unit_id=unit_id, payload=payload if isinstance(payload, dict) else {}, updated_at=row.updated_at)


@router.put("/{unit_id}/pdf-markup", response_model=UnitPdfMarkupRead)
async def put_pdf_markup(
    unit_id: str,
    body: UnitPdfMarkupWrite,
    session: AsyncSession = Depends(get_db),
) -> UnitPdfMarkupRead:
    await _require_unit(session, unit_id)
    now = utcnow()
    raw = json.dumps(body.payload)
    row = await session.get(UnitPdfMarkup, unit_id)
    if row:
        row.payload_json = raw
        row.updated_at = now
        session.add(row)
    else:
        row = UnitPdfMarkup(unit_id=unit_id, payload_json=raw, updated_at=now)
        session.add(row)
    await session.commit()
    await session.refresh(row)
    return UnitPdfMarkupRead(unit_id=unit_id, payload=body.payload, updated_at=row.updated_at)
