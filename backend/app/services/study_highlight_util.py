import hashlib
import json
from typing import Any


def normalize_highlight_text(text: str) -> str:
    return " ".join(text.split()).strip().lower()


def compute_text_hash(text: str) -> str:
    norm = normalize_highlight_text(text)
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


def rects_bbox(rects: list[dict[str, Any]]) -> tuple[float, float, float, float] | None:
    if not rects:
        return None
    min_x = min(r["x"] for r in rects)
    min_y = min(r["y"] for r in rects)
    max_x = max(r["x"] + r["w"] for r in rects)
    max_y = max(r["y"] + r["h"] for r in rects)
    return min_x, min_y, max_x, max_y


def _bbox_for_highlight(h: Any) -> tuple[float, float, float, float]:
    try:
        rects = json.loads(h.rects_json)
        if not isinstance(rects, list):
            return (0.0, 0.0, 1.0, 1.0)
        bb = rects_bbox([r for r in rects if isinstance(r, dict)])
    except (json.JSONDecodeError, KeyError, TypeError):
        bb = None
    return bb if bb is not None else (0.0, 0.0, 1.0, 1.0)


def merge_highlights_for_prompt(rows: list[Any]) -> list[tuple[str, str]]:
    """
    Dedupe by text_hash; merge same-page highlights that are vertically close.
    Returns list of (representative_highlight_id, merged_text).
    """
    by_hash: dict[str, Any] = {}
    for h in rows:
        if h.text_hash not in by_hash:
            by_hash[h.text_hash] = h

    unique = list(by_hash.values())
    items: list[tuple[Any, int, tuple[float, float, float, float]]] = []
    for h in unique:
        bb = _bbox_for_highlight(h)
        items.append((h, h.page, bb))
    items.sort(key=lambda x: (x[1], x[2][1]))

    if not items:
        return []

    GAP = 0.035
    groups: list[list[tuple[Any, int, tuple[float, float, float, float]]]] = [[items[0]]]
    for i in range(1, len(items)):
        _prev_h, prev_p, prev_bb = groups[-1][-1]
        h, p, bb = items[i]
        close = p == prev_p and (bb[1] - prev_bb[3]) <= GAP
        if close:
            groups[-1].append((h, p, bb))
        else:
            groups.append([(h, p, bb)])

    out: list[tuple[str, str]] = []
    for g in groups:
        primary_id = g[0][0].id
        texts = [x[0].extracted_text.strip() for x in g if x[0].extracted_text.strip()]
        merged = "\n".join(texts) if len(texts) > 1 else (texts[0] if texts else "")
        if merged:
            out.append((primary_id, merged))
    return out


def fingerprint_from_hashes(hashes: list[str]) -> str:
    joined = "|".join(sorted(hashes))
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()
