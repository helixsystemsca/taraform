import * as React from "react";
import { getStroke } from "perfect-freehand";

import type { NotePoint, NoteStroke, NotesTool } from "@/components/notes/types";

type ToolState = {
  tool: NotesTool;
  color: string;
  size: number;
};

type RenderOptions = {
  paperPaddingPx?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function strokeToFreehandPoints(points: NotePoint[]) {
  return points.map((p) => [p.x, p.y, p.pressure] as [number, number, number]);
}

function svgPathFromStroke(points: number[][]) {
  if (points.length === 0) return "";
  const d = points.reduce<string>((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length]!;
    return acc + `Q ${x0} ${y0} ${(x0 + x1) / 2} ${(y0 + y1) / 2} `;
  }, `M ${points[0]![0]} ${points[0]![1]} `);
  return d + "Z";
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: NoteStroke) {
  if (stroke.points.length === 0) return;

  if (stroke.tool === "eraser") return;

  const baseSize = stroke.size;
  const isHighlighter = stroke.tool === "highlighter";
  const color = stroke.color;

  const outline = getStroke(strokeToFreehandPoints(stroke.points), {
    size: baseSize,
    thinning: 0.6,
    smoothing: 0.65,
    streamline: 0.55,
    easing: (t) => t * t * (3 - 2 * t),
    start: { taper: baseSize * 0.7 },
    end: { taper: baseSize * 0.9 },
    simulatePressure: false,
  });

  const path = new Path2D(svgPathFromStroke(outline));
  ctx.save();
  ctx.globalAlpha = isHighlighter ? 0.32 : 0.92;
  ctx.fillStyle = color;
  ctx.fill(path);
  ctx.restore();
}

function distanceSq(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function eraseStrokes(strokes: NoteStroke[], eraserPoints: NotePoint[], radius: number) {
  if (eraserPoints.length === 0) return strokes;
  const r2 = radius * radius;

  return strokes.filter((s) => {
    if (s.tool === "eraser") return false;
    for (const ep of eraserPoints) {
      for (let i = 0; i < s.points.length; i += 2) {
        const p = s.points[i]!;
        if (distanceSq(p, ep) <= r2) return false;
      }
    }
    return true;
  });
}

function isProbablyPalm(e: PointerEvent) {
  if (e.pointerType !== "touch") return false;
  const w = (e.width ?? 0) || 0;
  const h = (e.height ?? 0) || 0;
  return w >= 32 || h >= 32;
}

function canvasPoint(canvas: HTMLCanvasElement, e: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

function createHiDpiCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const nextW = Math.max(1, Math.round(rect.width * dpr));
  const nextH = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== nextW) canvas.width = nextW;
  if (canvas.height !== nextH) canvas.height = nextH;
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { ctx, dpr };
}

export function useCanvasDrawing({
  strokes,
  onChangeStrokes,
  toolState,
  renderOptions,
}: {
  strokes: NoteStroke[];
  onChangeStrokes: (next: NoteStroke[] | ((prev: NoteStroke[]) => NoteStroke[]), opts?: { replace?: boolean }) => void;
  toolState: ToolState;
  renderOptions?: RenderOptions;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const baseBitmapRef = React.useRef<HTMLCanvasElement | null>(null);
  const strokesRef = React.useRef<NoteStroke[]>(strokes);

  const inProgressRef = React.useRef<NoteStroke | null>(null);
  const drawingPointerIdRef = React.useRef<number | null>(null);
  const isDrawingRef = React.useRef(false);
  const needsRebuildBaseRef = React.useRef(true);
  const rafRef = React.useRef<number | null>(null);

  const paperPaddingPx = renderOptions?.paperPaddingPx ?? 34;

  React.useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const ensureBaseBitmap = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const offscreen = baseBitmapRef.current ?? document.createElement("canvas");
    baseBitmapRef.current = offscreen;
    if (offscreen.width !== canvas.width) offscreen.width = canvas.width;
    if (offscreen.height !== canvas.height) offscreen.height = canvas.height;
    const bctx = offscreen.getContext("2d", { alpha: true });
    if (!bctx) return null;
    return { offscreen, bctx };
  }, []);

  const rebuildBase = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx } = createHiDpiCanvas(canvas);

    const ensured = ensureBaseBitmap();
    if (!ensured) return;
    const { offscreen, bctx } = ensured;

    bctx.clearRect(0, 0, offscreen.width, offscreen.height);
    for (const s of strokesRef.current) drawStroke(bctx, s);

    needsRebuildBaseRef.current = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscreen, 0, 0);
  }, [ensureBaseBitmap]);

  const commitStrokeToBase = React.useCallback(
    (stroke: NoteStroke) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      createHiDpiCanvas(canvas);

      const ensured = ensureBaseBitmap();
      if (!ensured) return;
      const { offscreen, bctx } = ensured;
      drawStroke(bctx, stroke);

      const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreen, 0, 0);
    },
    [ensureBaseBitmap],
  );

  const render = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx } = createHiDpiCanvas(canvas);

    if (needsRebuildBaseRef.current) rebuildBase();
    const offscreen = baseBitmapRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (offscreen) ctx.drawImage(offscreen, 0, 0);

    const inProgress = inProgressRef.current;
    if (inProgress) drawStroke(ctx, inProgress);
  }, [rebuildBase]);

  const scheduleRender = React.useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      render();
    });
  }, [render]);

  React.useEffect(() => {
    needsRebuildBaseRef.current = true;
    scheduleRender();
  }, [strokes, scheduleRender]);

  React.useEffect(() => {
    const onResize = () => {
      needsRebuildBaseRef.current = true;
      scheduleRender();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [scheduleRender]);

  const beginStroke = React.useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (isProbablyPalm(e.nativeEvent)) return;
      if (drawingPointerIdRef.current != null) return;

      const isPen = e.pointerType === "pen";
      if (e.pointerType === "touch" && (e.nativeEvent as PointerEvent).pressure === 0 && e.buttons === 0) return;

      drawingPointerIdRef.current = e.pointerId;
      isDrawingRef.current = true;
      canvas.setPointerCapture(e.pointerId);
      document.body.style.cursor = "none";

      const p = canvasPoint(canvas, e.nativeEvent);
      const { dpr } = createHiDpiCanvas(canvas);
      const pad = paperPaddingPx * dpr;
      const x = clamp(p.x, pad, canvas.width - pad);
      const y = clamp(p.y, pad, canvas.height - pad);

      const pressure = clamp(isPen ? e.pressure || 0.5 : e.pressure || 0.5, 0.08, 1);

      inProgressRef.current = {
        id: `stroke_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`,
        points: [{ x, y, pressure }],
        color: toolState.color,
        size: toolState.size,
        tool: toolState.tool,
      };
      scheduleRender();
    },
    [paperPaddingPx, scheduleRender, toolState.color, toolState.size, toolState.tool],
  );

  const moveStroke = React.useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (drawingPointerIdRef.current !== e.pointerId) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!inProgressRef.current) return;

      const p = canvasPoint(canvas, e.nativeEvent);
      const { dpr } = createHiDpiCanvas(canvas);
      const pad = paperPaddingPx * dpr;
      const x = clamp(p.x, pad, canvas.width - pad);
      const y = clamp(p.y, pad, canvas.height - pad);

      const isPen = e.pointerType === "pen";
      const pressure = clamp(isPen ? e.pressure || 0.5 : e.pressure || 0.5, 0.08, 1);

      const pts = inProgressRef.current.points;
      const last = pts[pts.length - 1];
      if (last && (Math.abs(last.x - x) + Math.abs(last.y - y) < 0.65)) return;
      pts.push({ x, y, pressure });
      scheduleRender();
    },
    [paperPaddingPx, scheduleRender],
  );

  const endStroke = React.useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (drawingPointerIdRef.current !== e.pointerId) return;
      const canvas = canvasRef.current;
      const stroke = inProgressRef.current;

      drawingPointerIdRef.current = null;
      isDrawingRef.current = false;
      inProgressRef.current = null;
      document.body.style.cursor = "";
      if (canvas) canvas.releasePointerCapture(e.pointerId);

      if (!stroke) return;
      if (stroke.points.length < 1) return;

      if (stroke.tool === "eraser") {
        const radius = Math.max(12, stroke.size * 1.35);
        onChangeStrokes((prev) => eraseStrokes(prev, stroke.points, radius));
        needsRebuildBaseRef.current = true;
        scheduleRender();
        return;
      } else {
        // Commit immediately to the base bitmap so the final stroke isn't "one behind".
        commitStrokeToBase(stroke);
        onChangeStrokes((prev) => [...prev, stroke]);
        needsRebuildBaseRef.current = false;
        scheduleRender();
        return;
      }
    },
    [commitStrokeToBase, onChangeStrokes, scheduleRender],
  );

  const cancelStroke = React.useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawingPointerIdRef.current !== e.pointerId) return;
    drawingPointerIdRef.current = null;
    isDrawingRef.current = false;
    inProgressRef.current = null;
    document.body.style.cursor = "";
    scheduleRender();
  }, [scheduleRender]);

  const clear = React.useCallback(() => {
    inProgressRef.current = null;
    drawingPointerIdRef.current = null;
    isDrawingRef.current = false;
    onChangeStrokes([], { replace: false });
    needsRebuildBaseRef.current = true;
    scheduleRender();
  }, [onChangeStrokes, scheduleRender]);

  const exportPng = React.useCallback((opts?: { background?: string }) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d");
    if (!ctx) return null;

    if (opts?.background) {
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, out.width, out.height);
    }
    const offscreen = baseBitmapRef.current;
    if (offscreen) ctx.drawImage(offscreen, 0, 0);
    const inProg = inProgressRef.current;
    if (inProg) drawStroke(ctx, inProg);
    return out.toDataURL("image/png");
  }, []);

  const bind = React.useMemo(
    () => ({
      ref: canvasRef,
      onPointerDown: beginStroke,
      onPointerMove: moveStroke,
      onPointerUp: endStroke,
      onPointerCancel: cancelStroke,
      onPointerLeave: (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (drawingPointerIdRef.current === e.pointerId) endStroke(e);
      },
    }),
    [beginStroke, cancelStroke, endStroke, moveStroke],
  );

  return {
    bind,
    rebuildBase,
    scheduleRender,
    clear,
    exportPng,
    isDrawingRef,
  };
}

