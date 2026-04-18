/**
 * Unified frontend annotation model (notes canvas + study PDF).
 * Persistence may map to separate APIs (markup JSON, sticky rows).
 */

export type AnnotationTool = "select" | "pen" | "highlighter" | "eraser" | "sticky";

export type StrokePoint = { x: number; y: number; pressure?: number };

export type Annotation =
  | {
      id: string;
      type: "stroke";
      tool: "pen" | "highlighter";
      points: StrokePoint[];
      color: string;
      size: number;
      page?: number;
    }
  | {
      id: string;
      type: "highlight";
      page: number;
      rects: { x: number; y: number; w: number; h: number }[];
      text: string;
    }
  | {
      id: string;
      type: "sticky";
      page: number;
      x: number;
      y: number;
      content: string;
    };

/** Composite selection keys (unique across surface). */
export function selectionKeyStroke(page: number, strokeId: string) {
  return `stroke:${page}:${strokeId}`;
}
export function selectionKeyHighlight(highlightId: string) {
  return `highlight:${highlightId}`;
}
export function selectionKeySticky(stickyId: string) {
  return `sticky:${stickyId}`;
}

export function parseSelectionKey(key: string | null): { kind: "stroke"; page: number; id: string } | { kind: "highlight"; id: string } | { kind: "sticky"; id: string } | null {
  if (!key) return null;
  if (key.startsWith("stroke:")) {
    const rest = key.slice("stroke:".length);
    const i = rest.indexOf(":");
    if (i <= 0) return null;
    const page = Number(rest.slice(0, i));
    const id = rest.slice(i + 1);
    if (!Number.isFinite(page) || !id) return null;
    return { kind: "stroke", page, id };
  }
  if (key.startsWith("highlight:")) return { kind: "highlight", id: key.slice("highlight:".length) };
  if (key.startsWith("sticky:")) return { kind: "sticky", id: key.slice("sticky:".length) };
  return null;
}

export function strokeBBox(points: StrokePoint[], pad = 8): { minX: number; minY: number; maxX: number; maxY: number } {
  if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = points[0]!.x;
  let minY = points[0]!.y;
  let maxX = minX;
  let maxY = minY;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

const STROKE_HIT_TOL = 22;

export function hitTestStrokeIndex(
  strokes: { id: string; points: { x: number; y: number }[] }[],
  x: number,
  y: number,
): number {
  const t2 = STROKE_HIT_TOL * STROKE_HIT_TOL;
  for (let si = strokes.length - 1; si >= 0; si--) {
    const s = strokes[si]!;
    for (const p of s.points) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy <= t2) return si;
    }
  }
  return -1;
}

export function highlightHitId(
  highlights: { id: string; rects: { x: number; y: number; w: number; h: number }[] }[],
  xr: number,
  yr: number,
): string | null {
  for (let i = highlights.length - 1; i >= 0; i--) {
    const h = highlights[i]!;
    for (const r of h.rects) {
      if (xr >= r.x && xr <= r.x + r.w && yr >= r.y && yr <= r.y + r.h) return h.id;
    }
  }
  return null;
}

/** Sticky card ~220×120 in px at scale; convert to ratio box around anchor (x,y). */
export function stickyHitId(
  notes: { id: string; x_position: number; y_position: number }[],
  xr: number,
  yr: number,
  cw: number,
  ch: number,
): string | null {
  const rw = 220 / cw;
  const rh = 120 / ch;
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i]!;
    const left = n.x_position - rw / 2;
    const top = n.y_position - rh * 1.08;
    if (xr >= left && xr <= left + rw && yr >= top && yr <= top + rh) return n.id;
  }
  return null;
}
