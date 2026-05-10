import json
import uuid
from typing import Any

from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..models.study_flashcard import StudyFlashcard
from ..models.study_generation_cache import StudyGenerationCache
from ..models.study_highlight import StudyHighlight
from ..models.study_quiz_question import StudyQuizQuestion
from ..schemas.study import GenerateStudyRequest, GenerateStudyResponse
from . import ai_service
from .study_highlight_service import ensure_unit
from .study_highlight_util import fingerprint_from_hashes, merge_highlights_for_prompt


def _chunk_blocks(blocks: list[tuple[str, str]], max_chars: int = 4_200) -> list[list[tuple[str, str]]]:
    batches: list[list[tuple[str, str]]] = []
    cur: list[tuple[str, str]] = []
    size = 0
    for hid, txt in blocks:
        piece = len(txt) + 80
        if cur and size + piece > max_chars:
            batches.append(cur)
            cur = []
            size = 0
        cur.append((hid, txt.strip()))
        size += piece
    if cur:
        batches.append(cur)
    return batches


async def _cache_hit(session: AsyncSession, unit_id: str, kind: str, fingerprint: str) -> bool:
    res = await session.execute(
        select(StudyGenerationCache).where(
            StudyGenerationCache.unit_id == unit_id,
            StudyGenerationCache.kind == kind,
            StudyGenerationCache.fingerprint == fingerprint,
        ),
    )
    return res.scalars().first() is not None


async def _record_cache(session: AsyncSession, unit_id: str, kind: str, fingerprint: str) -> None:
    cid = str(uuid.uuid4())
    row = StudyGenerationCache(id=cid, unit_id=unit_id, kind=kind, fingerprint=fingerprint)
    session.add(row)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()


async def run_study_generation(session: AsyncSession, body: GenerateStudyRequest) -> GenerateStudyResponse:
    unit = await ensure_unit(session, body.unit_id)
    if unit is None:
        raise ValueError("unit_not_found")

    res = await session.execute(select(StudyHighlight).where(StudyHighlight.unit_id == body.unit_id))
    all_rows = list(res.scalars().all())

    partial = bool(body.highlight_ids)
    if body.highlight_ids:
        wanted = set(body.highlight_ids)
        selected = [h for h in all_rows if h.id in wanted]
    else:
        selected = all_rows

    if not selected:
        raise ValueError("no_highlights")

    hashes = sorted({h.text_hash for h in selected})
    fp = fingerprint_from_hashes(hashes)
    out = GenerateStudyResponse(fingerprint=fp)

    merged = merge_highlights_for_prompt(selected)
    if not merged:
        raise ValueError("no_highlight_text")

    batches = _chunk_blocks(merged)

    if "flashcards" in body.modes:
        skip = not partial and not body.force and await _cache_hit(session, body.unit_id, "flashcards", fp)
        if skip:
            out.skipped_flashcards = True
        else:
            if partial and body.highlight_ids:
                await session.execute(
                    delete(StudyFlashcard).where(StudyFlashcard.highlight_id.in_(body.highlight_ids)),
                )
            else:
                await session.execute(delete(StudyFlashcard).where(StudyFlashcard.unit_id == body.unit_id))
                await session.execute(
                    delete(StudyGenerationCache).where(
                        StudyGenerationCache.unit_id == body.unit_id,
                        StudyGenerationCache.kind == "flashcards",
                    ),
                )
            await session.commit()

            created = 0
            for batch in batches:
                cards = await ai_service.run_flashcards_from_highlights(batch)
                for c in cards:
                    idx = int(c["highlight_index"])
                    hid = batch[idx][0]
                    fc = StudyFlashcard(
                        id=str(uuid.uuid4()),
                        unit_id=body.unit_id,
                        highlight_id=hid,
                        question=c["question"],
                        answer=c["answer"],
                        difficulty=str(c.get("difficulty", "medium")),
                    )
                    session.add(fc)
                    created += 1
                await session.commit()

            if not partial:
                await _record_cache(session, body.unit_id, "flashcards", fp)
            out.flashcards_created = created

    if "quiz" in body.modes:
        skip_q = not partial and not body.force and await _cache_hit(session, body.unit_id, "quiz", fp)
        if skip_q:
            out.skipped_quiz = True
        else:
            if partial and body.highlight_ids:
                await session.execute(
                    delete(StudyQuizQuestion).where(StudyQuizQuestion.highlight_id.in_(body.highlight_ids)),
                )
            else:
                await session.execute(delete(StudyQuizQuestion).where(StudyQuizQuestion.unit_id == body.unit_id))
                await session.execute(
                    delete(StudyGenerationCache).where(
                        StudyGenerationCache.unit_id == body.unit_id,
                        StudyGenerationCache.kind == "quiz",
                    ),
                )
            await session.commit()

            q_created = 0
            for batch in batches:
                questions = await ai_service.run_quiz_from_highlights(batch)
                for q in questions:
                    idx = int(q["highlight_index"])
                    hid = batch[idx][0]
                    qq = StudyQuizQuestion(
                        id=str(uuid.uuid4()),
                        unit_id=body.unit_id,
                        highlight_id=hid,
                        question=q["question"],
                        options_json=json.dumps(q.get("options") or [], ensure_ascii=False),
                        correct_answer=q["correct_answer"],
                        explanation=q.get("explanation") or "",
                        question_type=q["question_type"],
                    )
                    session.add(qq)
                    q_created += 1
                await session.commit()

            if not partial:
                await _record_cache(session, body.unit_id, "quiz", fp)
            out.quiz_questions_created = q_created

    return out


async def list_flashcards_read(session: AsyncSession, unit_id: str) -> list[dict[str, Any]]:
    res = await session.execute(
        select(StudyFlashcard).where(StudyFlashcard.unit_id == unit_id).order_by(StudyFlashcard.created_at),
    )
    rows = list(res.scalars().all())
    return [
        {
            "id": r.id,
            "unit_id": r.unit_id,
            "highlight_id": r.highlight_id,
            "question": r.question,
            "answer": r.answer,
            "difficulty": r.difficulty,
            "created_at": r.created_at,
        }
        for r in rows
    ]


async def list_quiz_read(session: AsyncSession, unit_id: str) -> list[dict[str, Any]]:
    res = await session.execute(
        select(StudyQuizQuestion)
        .where(StudyQuizQuestion.unit_id == unit_id)
        .order_by(StudyQuizQuestion.created_at),
    )
    rows = list(res.scalars().all())
    out: list[dict[str, Any]] = []
    for r in rows:
        try:
            opts = json.loads(r.options_json)
            options = [str(x) for x in opts] if isinstance(opts, list) else []
        except json.JSONDecodeError:
            options = []
        out.append(
            {
                "id": r.id,
                "unit_id": r.unit_id,
                "highlight_id": r.highlight_id,
                "question": r.question,
                "options": options,
                "correct_answer": r.correct_answer,
                "explanation": r.explanation,
                "question_type": r.question_type,
                "created_at": r.created_at,
            }
        )
    return out
