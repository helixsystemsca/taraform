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
