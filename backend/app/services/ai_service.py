import json
import os
from typing import Any

from openai import AsyncOpenAI

from ..schemas.ai import CoachResponse

SYSTEM_COACH = (
    "You are an expert study coach. Help improve the user's understanding. "
    "Do not rewrite their summary. Be concise and structured."
)

SYSTEM_IMPROVE = (
    "You improve study summaries using structured feedback. "
    "Keep the result concise. Do not add unnecessary detail beyond what the feedback implies."
)

SYSTEM_FLASHCARDS = (
    "Create flashcards for spaced repetition. Use ONLY the student summary and coach feedback "
    "given—do not invent facts or use external knowledge. "
    "Front = clear question or prompt; back = concise answer (one short sentence when possible). "
    "Return JSON with key \"cards\": an array of 5 to 10 objects, each with \"front\" and \"back\" strings."
)

SYSTEM_FLASHCARDS_HIGHLIGHTS = (
    "You create flashcards for active recall. Use ONLY the excerpt blocks provided—do not invent facts "
    "or use outside knowledge. Each card must be grounded in exactly one excerpt via highlight_index. "
    "Questions should force retrieval (cloze-style, definition recall, or application). "
    "Return JSON only: {\"cards\":[{\"question\":string,\"answer\":string,\"highlight_index\":int,"
    "\"difficulty\":\"easy\"|\"medium\"|\"hard\"}, ...]}. Provide 4 to 12 cards when excerpts allow."
)

SYSTEM_QUIZ_HIGHLIGHTS = (
    "You write quiz questions for active recall. Use ONLY the excerpt blocks provided. "
    "Include a mix of question_type: \"mcq\" (4 options), \"true_false\", and \"short_answer\". "
    "For mcq, include \"options\" array (4 strings). For true_false use options [\"True\",\"False\"]. "
    "For short_answer use empty options []. "
    "Return JSON only: {\"questions\":[{\"question_type\":\"mcq\"|\"true_false\"|\"short_answer\","
    "\"question\":string,\"options\":string[],\"correct_answer\":string,\"explanation\":string,"
    "\"highlight_index\":int}, ...]}. Aim for 6 to 14 questions."
)


def _client() -> AsyncOpenAI:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return AsyncOpenAI(api_key=key)


def _parse_coach_json(raw: str) -> CoachResponse:
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("not an object")
    return CoachResponse.model_validate(
        {
            "missing_concepts": _clip_list(data.get("missing_concepts"), 5),
            "unclear_points": _clip_list(data.get("unclear_points"), 5),
            "improvement_suggestions": _clip_list(data.get("improvement_suggestions"), 5),
        }
    )


def _clip_list(val: Any, max_items: int) -> list[str]:
    if not isinstance(val, list):
        return []
    out: list[str] = []
    for x in val[:max_items]:
        if isinstance(x, str) and (s := x.strip()):
            out.append(s[:400])
    return out


async def run_coach(source_text: str, user_summary: str) -> CoachResponse:
    src = source_text.strip()[:12_000]
    summ = user_summary.strip()[:8_000]
    user_prompt = (
        f"Source text:\n---\n{src}\n---\n\n"
        f"User summary:\n---\n{summ}\n---\n\n"
        "Return JSON only with keys: missing_concepts, unclear_points, improvement_suggestions. "
        "Each must be an array of 3 to 5 short strings."
    )

    client = _client()
    last_err: Exception | None = None
    for attempt in range(2):
        try:
            completion = await client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.3,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_COACH},
                    {"role": "user", "content": user_prompt},
                ],
            )
            raw = completion.choices[0].message.content or "{}"
            return _parse_coach_json(raw)
        except Exception as e:  # noqa: BLE001
            last_err = e
            if attempt == 0:
                user_prompt += "\n\nYour previous reply was invalid. Reply with valid JSON only matching the schema."
    assert last_err is not None
    raise last_err


async def run_improve(user_summary: str, ai_feedback: dict[str, Any]) -> str:
    summ = user_summary.strip()[:8_000]
    fb = json.dumps(ai_feedback, ensure_ascii=False)[:6_000]
    user_prompt = (
        f"User summary:\n---\n{summ}\n---\n\n"
        f"Coach feedback (JSON):\n{fb}\n\n"
        "Return JSON only with a single key: improved_summary (string). "
        "The improved summary should incorporate the feedback while staying concise."
    )
    client = _client()
    last_err: Exception | None = None
    for attempt in range(2):
        try:
            completion = await client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.25,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_IMPROVE},
                    {"role": "user", "content": user_prompt},
                ],
            )
            raw = completion.choices[0].message.content or "{}"
            data = json.loads(raw)
            if isinstance(data, dict) and isinstance(data.get("improved_summary"), str):
                out = data["improved_summary"].strip()
                if out:
                    return out[:20_000]
            raise ValueError("missing improved_summary")
        except Exception as e:  # noqa: BLE001
            last_err = e
            if attempt == 0:
                user_prompt += "\n\nReply with valid JSON: {\"improved_summary\": \"...\"} only."
    assert last_err is not None
    raise last_err


def _feedback_compact(fb: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in ("missing_concepts", "unclear_points", "improvement_suggestions"):
        xs = fb.get(key)
        if isinstance(xs, list):
            flat = "; ".join(str(x).strip() for x in xs[:6] if str(x).strip())
            if flat:
                parts.append(f"{key}: {flat}")
    return " | ".join(parts)[:2_000]


def _parse_flashcards_json(raw: str) -> list[dict[str, str]]:
    data = json.loads(raw)
    if isinstance(data, list):
        arr = data
    elif isinstance(data, dict) and isinstance(data.get("cards"), list):
        arr = data["cards"]
    else:
        raise ValueError("expected cards array")
    out: list[dict[str, str]] = []
    for item in arr[:12]:
        if not isinstance(item, dict):
            continue
        f = item.get("front")
        b = item.get("back")
        if isinstance(f, str) and isinstance(b, str) and f.strip() and b.strip():
            out.append({"front": f.strip()[:600], "back": b.strip()[:900]})
    if len(out) < 5:
        raise ValueError("too_few_cards")
    return out[:10]


def _format_excerpt_lines(blocks: list[tuple[str, str]]) -> str:
    lines: list[str] = []
    for i, (hid, text) in enumerate(blocks):
        excerpt = text.strip()[:4_000]
        lines.append(f"{i} — {hid} — {excerpt}")
    return "\n".join(lines)


def _parse_flashcards_from_highlights(raw: str, n_excerpts: int) -> list[dict[str, Any]]:
    data = json.loads(raw)
    if not isinstance(data, dict) or not isinstance(data.get("cards"), list):
        raise ValueError("expected cards array")
    out: list[dict[str, Any]] = []
    for item in data["cards"][:24]:
        if not isinstance(item, dict):
            continue
        q = item.get("question")
        a = item.get("answer")
        idx = item.get("highlight_index")
        diff = item.get("difficulty", "medium")
        if not isinstance(q, str) or not isinstance(a, str) or not isinstance(idx, int):
            continue
        if not q.strip() or not a.strip():
            continue
        if idx < 0 or idx >= n_excerpts:
            continue
        dstr = str(diff).lower() if isinstance(diff, str) else "medium"
        if dstr not in {"easy", "medium", "hard"}:
            dstr = "medium"
        out.append(
            {
                "question": q.strip()[:600],
                "answer": a.strip()[:900],
                "highlight_index": idx,
                "difficulty": dstr,
            }
        )
    if len(out) < 2:
        raise ValueError("too_few_cards")
    return out


def _parse_quiz_from_highlights(raw: str, n_excerpts: int) -> list[dict[str, Any]]:
    data = json.loads(raw)
    if not isinstance(data, dict) or not isinstance(data.get("questions"), list):
        raise ValueError("expected questions array")
    out: list[dict[str, Any]] = []
    for item in data["questions"][:30]:
        if not isinstance(item, dict):
            continue
        qt = item.get("question_type")
        q = item.get("question")
        opts = item.get("options")
        ca = item.get("correct_answer")
        expl = item.get("explanation", "")
        idx = item.get("highlight_index")
        if qt not in ("mcq", "true_false", "short_answer"):
            continue
        if not isinstance(q, str) or not q.strip():
            continue
        if not isinstance(ca, str) or not ca.strip():
            continue
        if not isinstance(idx, int) or idx < 0 or idx >= n_excerpts:
            continue
        opt_list: list[str] = []
        if isinstance(opts, list):
            opt_list = [str(x).strip() for x in opts if str(x).strip()]
        if qt == "mcq" and len(opt_list) < 2:
            continue
        if qt == "true_false" and len(opt_list) < 2:
            opt_list = ["True", "False"]
        if qt == "short_answer":
            opt_list = []
        expl_s = expl.strip()[:2_000] if isinstance(expl, str) else ""
        out.append(
            {
                "question_type": qt,
                "question": q.strip()[:1_200],
                "options": opt_list[:8],
                "correct_answer": ca.strip()[:600],
                "explanation": expl_s,
                "highlight_index": idx,
            }
        )
    if len(out) < 2:
        raise ValueError("too_few_questions")
    return out


async def run_flashcards_from_highlights(blocks: list[tuple[str, str]]) -> list[dict[str, Any]]:
    if not blocks:
        raise ValueError("no_excerpts")
    lines = _format_excerpt_lines(blocks)
    user_prompt = (
        "EXCERPTS (index — highlight_id — text):\n"
        f"{lines}\n\n"
        "Create flashcards grounded in these excerpts only. "
        "highlight_index must reference the excerpt index (left column). "
        'Return JSON: {"cards":[{"question":"...","answer":"...","highlight_index":0,"difficulty":"medium"}, ...]}'
    )
    client = _client()
    last_err: Exception | None = None
    for attempt in range(2):
        try:
            completion = await client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.35,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_FLASHCARDS_HIGHLIGHTS},
                    {"role": "user", "content": user_prompt},
                ],
            )
            raw = completion.choices[0].message.content or "{}"
            return _parse_flashcards_from_highlights(raw, len(blocks))
        except Exception as e:  # noqa: BLE001
            last_err = e
            if attempt == 0:
                user_prompt += "\n\nReply with valid JSON; highlight_index must be within range."
    assert last_err is not None
    raise last_err


async def run_quiz_from_highlights(blocks: list[tuple[str, str]]) -> list[dict[str, Any]]:
    if not blocks:
        raise ValueError("no_excerpts")
    lines = _format_excerpt_lines(blocks)
    user_prompt = (
        "EXCERPTS (index — highlight_id — text):\n"
        f"{lines}\n\n"
        "Write quiz questions grounded in these excerpts only. "
        "highlight_index must reference the excerpt index. "
        "Vary question_type across mcq, true_false, and short_answer."
    )
    client = _client()
    last_err: Exception | None = None
    for attempt in range(2):
        try:
            completion = await client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.35,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_QUIZ_HIGHLIGHTS},
                    {"role": "user", "content": user_prompt},
                ],
            )
            raw = completion.choices[0].message.content or "{}"
            return _parse_quiz_from_highlights(raw, len(blocks))
        except Exception as e:  # noqa: BLE001
            last_err = e
            if attempt == 0:
                user_prompt += "\n\nReply with valid JSON only; include highlight_index for each question."
    assert last_err is not None
    raise last_err


async def run_flashcards(user_summary: str, ai_feedback: dict[str, Any]) -> list[dict[str, str]]:
    summ = user_summary.strip()[:2_500]
    fb_line = _feedback_compact(ai_feedback)
    user_prompt = (
        f"Student summary:\n{summ}\n\n"
        f"Coach feedback (compact):\n{fb_line}\n\n"
        "Return JSON only: {\"cards\":[{\"front\":\"...\",\"back\":\"...\"}, ...]} with between 5 and 10 cards."
    )
    client = _client()
    last_err: Exception | None = None
    for attempt in range(2):
        try:
            completion = await client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.35,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_FLASHCARDS},
                    {"role": "user", "content": user_prompt},
                ],
            )
            raw = completion.choices[0].message.content or "{}"
            return _parse_flashcards_json(raw)
        except Exception as e:  # noqa: BLE001
            last_err = e
            if attempt == 0:
                user_prompt += "\n\nYou must return at least 5 valid cards in \"cards\"."
    assert last_err is not None
    raise last_err
