import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.unit import Unit
from app.schemas.unit import UnitCreateResponse

router = APIRouter()

MAX_UPLOAD_MB = 40


def _upload_root() -> Path:
    return Path(os.getenv("UPLOAD_ROOT", "uploads")).resolve()


@router.post("/", response_model=UnitCreateResponse)
async def create_unit(
    session: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
) -> UnitCreateResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="pdf_required")
    content_type = (file.content_type or "").lower()
    if content_type and "pdf" not in content_type and content_type != "application/octet-stream":
        raise HTTPException(status_code=400, detail="invalid_content_type")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="file_too_large")

    root = _upload_root()
    root.mkdir(parents=True, exist_ok=True)
    uid = str(uuid.uuid4())
    safe_name = f"{uid}.pdf"
    path = root / safe_name
    path.write_bytes(raw)

    text_preview = ""
    try:
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        parts: list[str] = []
        max_pages = min(len(reader.pages), 25)
        for i in range(max_pages):
            t = reader.pages[i].extract_text() or ""
            if t.strip():
                parts.append(t.strip())
        text_preview = "\n\n".join(parts).strip()[:8000]
    except Exception:  # noqa: BLE001
        text_preview = ""

    display_title = (title or file.filename or "Unit").strip()[:512] or "Unit"
    cwd = Path.cwd()
    try:
        rel_path = str(path.relative_to(cwd))
    except ValueError:
        rel_path = str(path)

    unit = Unit(id=uid, title=display_title, pdf_file_path=rel_path)
    session.add(unit)
    await session.commit()
    await session.refresh(unit)

    return UnitCreateResponse(
        id=unit.id,
        title=unit.title,
        pdf_file_path=unit.pdf_file_path,
        created_at=unit.created_at,
        text_preview=text_preview,
    )
