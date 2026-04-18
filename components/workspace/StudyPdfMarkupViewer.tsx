"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { getStroke } from "perfect-freehand";
import { Minus, Plus } from "lucide-react";
import { v4 as uuid } from "uuid";

import { NotesToolbar } from "@/components/notes/NotesToolbar";
import type { NotePoint, NoteStroke, NotesTool } from "@/components/notes/types";
import { configurePdfjsWorker } from "@/lib/pdfjsClient";
import {
  createStickyNote,
  deleteStickyNote,
  getPdfMarkup,
  patchStickyNote,
  putPdfMarkup,
  studyApiConfigured,
  type PdfMarkupPayload,
  type PdfTextHighlightDto,
  type StickyNoteDto,
} from "@/lib/studyApi";
import { useAnnotationToolbarStore } from "@/stores/useAnnotationToolbarStore";
import { useMarkupSnapshotUndo, type MarkupSnapshot } from "@/hooks/useMarkupSnapshotUndo";
import { cn } from "@/lib/utils";

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
  if (stroke.points.length === 0 || stroke.tool === "eraser") return;
  const outline = getStroke(strokeToFreehandPoints(stroke.points), {
    size: stroke.size,
    thinning: 0.6,
    smoothing: 0.65,
    streamline: 0.55,
    easing: (t) => t * t * (3 - 2 * t),
    start: { taper: stroke.size * 0.7 },
    end: { taper: stroke.size * 0.9 },
    simulatePressure: false,
  });
  const path = new Path2D(svgPathFromStroke(outline));
  ctx.save();
  ctx.globalAlpha = stroke.tool === "highlighter" ? 0.34 : 0.92;
  ctx.fillStyle = stroke.color;
  ctx.fill(path);
  ctx.restore();
}

function redrawInk(canvas: HTMLCanvasElement | null, strokes: NoteStroke[]) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const s of strokes) drawStroke(ctx, s);
}

function canvasPoint(canvas: HTMLCanvasElement, e: React.PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

function useIntersectionVisible(target: HTMLElement | null, root: HTMLElement | null) {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    if (!target) {
      setVisible(false);
      return;
    }
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), {
      root: root ?? undefined,
      rootMargin: "360px 0px",
      threshold: 0,
    });
    io.observe(target);
    return () => io.disconnect();
  }, [target, root]);
  return visible;
}

function hitStrokeRemove(strokes: NoteStroke[], x: number, y: number, tol = 18): NoteStroke[] {
  const t2 = tol * tol;
  return strokes.filter((s) => {
    for (const p of s.points) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy <= t2) return false;
    }
    return true;
  });
}

function rectsFromSelection(wrap: HTMLElement): { x: number; y: number; w: number; h: number }[] {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount < 1) return [];
  const range = sel.getRangeAt(0);
  if (!wrap.contains(range.commonAncestorContainer)) return [];
  const pr = wrap.getBoundingClientRect();
  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (const r of Array.from(range.getClientRects())) {
    if (r.width < 1 || r.height < 1) continue;
    out.push({
      x: (r.left - pr.left) / pr.width,
      y: (r.top - pr.top) / pr.height,
      w: r.width / pr.width,
      h: r.height / pr.height,
    });
  }
  return out;
}

function PdfStickyCard({
  note,
  onPatch,
  onDelete,
}: {
  note: StickyNoteDto;
  onPatch: (id: string, body: { x_position?: number; y_position?: number; content?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const dragRef = React.useRef<{ pid: number; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const posRef = React.useRef({ x: note.x_position, y: note.y_position });
  const [local, setLocal] = React.useState({ x: note.x_position, y: note.y_position });
  const [draftContent, setDraftContent] = React.useState(note.content);
  React.useEffect(() => {
    posRef.current = { x: note.x_position, y: note.y_position };
    setLocal({ x: note.x_position, y: note.y_position });
    setDraftContent(note.content);
  }, [note.x_position, note.y_position, note.content, note.id]);

  const t = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePatch = React.useCallback(
    (body: { x_position?: number; y_position?: number; content?: string }) => {
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => onPatch(note.id, body), 450);
    },
    [note.id, onPatch],
  );

  return (
    <div
      className="absolute z-[6] w-[min(220px,72vw)] cursor-grab select-none active:cursor-grabbing"
      style={{
        left: `${local.x * 100}%`,
        top: `${local.y * 100}%`,
        transform: "translate(-50%, -108%)",
      }}
      data-study-sticky
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("textarea")) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = {
          pid: e.pointerId,
          sx: e.clientX,
          sy: e.clientY,
          ox: posRef.current.x,
          oy: posRef.current.y,
        };
      }}
      onPointerMove={(e) => {
        const d = dragRef.current;
        if (!d || d.pid !== e.pointerId || !e.currentTarget.parentElement) return;
        const pr = e.currentTarget.parentElement.getBoundingClientRect();
        const dx = (e.clientX - d.sx) / pr.width;
        const dy = (e.clientY - d.sy) / pr.height;
        const nx = Math.min(0.98, Math.max(0.02, d.ox + dx));
        const ny = Math.min(0.98, Math.max(0.02, d.oy + dy));
        posRef.current = { x: nx, y: ny };
        setLocal({ x: nx, y: ny });
      }}
      onPointerUp={(e) => {
        const d = dragRef.current;
        if (!d || d.pid !== e.pointerId) return;
        dragRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        schedulePatch({ x_position: posRef.current.x, y_position: posRef.current.y });
      }}
      onPointerCancel={(e) => {
        dragRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }}
    >
      <div
        className={cn(
          "rounded-lg border border-[rgba(197,143,143,0.35)] px-2.5 pb-2 pt-2 shadow-warm",
          "bg-gradient-to-br from-[#fff9e6] via-[#fff3d6] to-[#fde8d4]",
          "rotate-[-0.8deg]",
        )}
      >
        <textarea
          value={draftContent}
          placeholder="Jot something…"
          rows={3}
          className="w-full resize-y rounded-md border border-[rgba(120,90,80,0.12)] bg-white/75 px-2 py-1.5 text-xs leading-snug text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none focus:border-copper/35"
          onChange={(ev) => {
            const content = ev.target.value;
            setDraftContent(content);
            schedulePatch({ content });
          }}
        />
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            className="text-[10px] font-medium text-ink-muted underline decoration-rose-deep/30 underline-offset-2 hover:text-rose-deep"
            onClick={() => onDelete(note.id)}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function PdfPageInner({
  pdf,
  pageNumber,
  maxCssWidth,
  tool,
  size,
  strokes,
  pageHighlights,
  pageStickies,
  onStrokesChange,
  onAddHighlight,
  onErasePage,
  onExcerpt,
  onStickyCreate,
  onStickyPatch,
  onStickyDelete,
  onLayout,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  maxCssWidth: number;
  tool: NotesTool;
  size: number;
  strokes: NoteStroke[];
  pageHighlights: PdfTextHighlightDto[];
  pageStickies: StickyNoteDto[];
  onStrokesChange: (next: NoteStroke[]) => void;
  onAddHighlight: (hl: PdfTextHighlightDto) => void;
  onErasePage: (page: number, xr: number, yr: number, cw: number, ch: number) => void;
  onExcerpt: (text: string, force?: boolean) => void;
  onStickyCreate: (page: number, x: number, y: number) => void;
  onStickyPatch: (id: string, body: { x_position?: number; y_position?: number; content?: string }) => void;
  onStickyDelete: (id: string) => void;
  onLayout?: (h: number) => void;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const textRef = React.useRef<HTMLDivElement>(null);
  const inkRef = React.useRef<HTMLCanvasElement>(null);
  const [cssSize, setCssSize] = React.useState({ w: 0, h: 0 });
  const draftRef = React.useRef<NotePoint[]>([]);
  const drawingRef = React.useRef(false);
  const onLayoutRef = React.useRef(onLayout);
  onLayoutRef.current = onLayout;
  const strokesRef = React.useRef(strokes);
  strokesRef.current = strokes;

  React.useLayoutEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;

    (async () => {
      const pdfjs = await import("pdfjs-dist");
      configurePdfjsWorker(pdfjs);
      const { TextLayer } = pdfjs;
      const page = await pdf.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.max(0.35, maxCssWidth / base.width);
      const viewport = page.getViewport({ scale });
      const w = Math.floor(viewport.width);
      const h = Math.floor(viewport.height);
      if (cancelled) return;
      setCssSize({ w, h });
      onLayoutRef.current?.(h);

      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const canvas = canvasRef.current;
      const textDiv = textRef.current;
      const ink = inkRef.current;
      if (!canvas || !textDiv || !ink || cancelled) return;

      canvas.width = w;
      canvas.height = h;
      ink.width = w;
      ink.height = h;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      const task = page.render({ canvasContext: ctx, viewport, canvas });
      renderTask = task;
      await task.promise;
      if (cancelled) return;

      textDiv.innerHTML = "";
      const tl = new TextLayer({
        textContentSource: page.streamTextContent(),
        container: textDiv,
        viewport,
      });
      await tl.render();
      if (cancelled) return;

      redrawInk(ink, strokesRef.current);
    })().catch(() => {});

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, maxCssWidth]);

  React.useEffect(() => {
    redrawInk(inkRef.current, strokes);
  }, [strokes, cssSize.w, cssSize.h]);

  const lastHlTextRef = React.useRef("");

  React.useEffect(() => {
    lastHlTextRef.current = "";
  }, [tool, pageNumber]);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onUp = () => {
      if (tool === "highlighter") {
        const rects = rectsFromSelection(wrap);
        const t = window.getSelection()?.toString().replace(/\s+/g, " ").trim() ?? "";
        if (rects.length && t.length && t !== lastHlTextRef.current) {
          lastHlTextRef.current = t;
          onAddHighlight({
            id: uuid(),
            page_number: pageNumber,
            text: t,
            rects,
          });
          onExcerpt(t, false);
        }
        return;
      }
      if (tool === "select") {
        const t = window.getSelection()?.toString().replace(/\s+/g, " ").trim() ?? "";
        if (t && wrap.contains(window.getSelection()?.anchorNode ?? null)) onExcerpt(t, false);
      }
    };
    wrap.addEventListener("pointerup", onUp);
    return () => wrap.removeEventListener("pointerup", onUp);
  }, [tool, pageNumber, onAddHighlight, onExcerpt]);

  const onInkPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== "eraser") return;
    e.preventDefault();
    const ink = inkRef.current;
    if (!ink) return;
    ink.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = canvasPoint(ink, e);
    draftRef.current = [{ x: p.x, y: p.y, pressure: 0.5 }];
  };

  const onInkPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== "eraser" || !drawingRef.current) return;
    const ink = inkRef.current;
    if (!ink) return;
    const p = canvasPoint(ink, e);
    draftRef.current.push({ x: p.x, y: p.y, pressure: 0.5 });
    const draft: NoteStroke = {
      id: "eraser",
      points: draftRef.current,
      color: "#000",
      size,
      tool: "eraser",
    };
    const er = draft.points;
    const radius = Math.max(12, size * 1.35);
    const r2 = radius * radius;
    const next = strokes.filter((s) => {
      for (const ep of er) {
        for (let i = 0; i < s.points.length; i += 2) {
          const pt = s.points[i]!;
          const dx = pt.x - ep.x;
          const dy = pt.y - ep.y;
          if (dx * dx + dy * dy <= r2) return false;
        }
      }
      return true;
    });
    redrawInk(ink, next);
  };

  const onInkPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== "eraser") return;
    const ink = inkRef.current;
    if (ink?.hasPointerCapture(e.pointerId)) ink.releasePointerCapture(e.pointerId);
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const pts = draftRef.current;
    draftRef.current = [];
    redrawInk(ink, strokes);
    if (pts.length < 2) return;
    const radius = Math.max(12, size * 1.35);
    const r2 = radius * radius;
    const next = strokes.filter((s) => {
      for (const ep of pts) {
        for (let i = 0; i < s.points.length; i += 2) {
          const pt = s.points[i]!;
          const dx = pt.x - ep.x;
          const dy = pt.y - ep.y;
          if (dx * dx + dy * dy <= r2) return false;
        }
      }
      return true;
    });
    if (next.length !== strokes.length) onStrokesChange(next);
  };

  const onWrapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!wrapRef.current) return;
    if ((e.target as HTMLElement).closest("[data-study-sticky]")) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const xr = (e.clientX - rect.left) / rect.width;
    const yr = (e.clientY - rect.top) / rect.height;

    if (tool === "sticky") {
      onStickyCreate(pageNumber, xr, yr);
      return;
    }
    if (tool === "eraser" && cssSize.w > 0 && cssSize.h > 0) {
      onErasePage(pageNumber, xr, yr, cssSize.w, cssSize.h);
    }
  };

  const textPointer = tool === "select" || tool === "highlighter";
  const inkPointer = tool === "eraser";

  return (
    <div
      ref={wrapRef}
      className="study-pdf-page-wrap relative mx-auto mb-3 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.06)]"
      style={{ width: cssSize.w ? cssSize.w : undefined }}
      onPointerDown={tool === "sticky" || tool === "eraser" ? onWrapPointerDown : undefined}
    >
      {cssSize.w > 0 ? (
        <>
          <canvas ref={canvasRef} className="relative z-0 block max-w-full" style={{ width: cssSize.w, height: cssSize.h }} />
          <div className="pointer-events-none absolute inset-0 z-[1]">
            {pageHighlights.map((h) => (
              <React.Fragment key={h.id}>
                {h.rects.map((r, i) => (
                  <div
                    key={`${h.id}-${i}`}
                    className="absolute rounded-sm bg-[rgba(255,230,120,0.42)] mix-blend-multiply"
                    style={{
                      left: `${r.x * 100}%`,
                      top: `${r.y * 100}%`,
                      width: `${r.w * 100}%`,
                      height: `${r.h * 100}%`,
                    }}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
          <div
            ref={textRef}
            className={cn(
              "study-pdf-text-layer z-[2]",
              textPointer ? "pointer-events-auto" : "pointer-events-none",
            )}
          />
          <canvas
            ref={inkRef}
            className={cn("absolute left-0 top-0 z-[3] touch-none", inkPointer ? "pointer-events-auto" : "pointer-events-none")}
            style={{ width: cssSize.w, height: cssSize.h }}
            onPointerDown={onInkPointerDown}
            onPointerMove={onInkPointerMove}
            onPointerUp={onInkPointerUp}
            onPointerCancel={onInkPointerUp}
          />
          {pageStickies.map((n) => (
            <PdfStickyCard key={n.id} note={n} onPatch={onStickyPatch} onDelete={onStickyDelete} />
          ))}
        </>
      ) : (
        <div className="flex min-h-[200px] items-center justify-center text-xs text-ink-muted">Loading page…</div>
      )}
    </div>
  );
}

function PdfPageSlot({
  pdf,
  pageNumber,
  scrollRoot,
  maxCssWidth,
  placeholderHeight,
  onHeight,
  onStrokesChangeForPage,
  tool,
  size,
  strokes,
  pageHighlights,
  pageStickies,
  onAddHighlight,
  onErasePage,
  onExcerpt,
  onStickyCreate,
  onStickyPatch,
  onStickyDelete,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scrollRoot: HTMLElement | null;
  maxCssWidth: number;
  placeholderHeight: number;
  onHeight: (page: number, h: number) => void;
  onStrokesChangeForPage: (page: number, next: NoteStroke[]) => void;
  tool: NotesTool;
  size: number;
  strokes: NoteStroke[];
  pageHighlights: PdfTextHighlightDto[];
  pageStickies: StickyNoteDto[];
  onAddHighlight: (hl: PdfTextHighlightDto) => void;
  onErasePage: (page: number, xr: number, yr: number, cw: number, ch: number) => void;
  onExcerpt: (text: string, force?: boolean) => void;
  onStickyCreate: (page: number, x: number, y: number) => void;
  onStickyPatch: (id: string, body: { x_position?: number; y_position?: number; content?: string }) => void;
  onStickyDelete: (id: string) => void;
}) {
  const [slotEl, setSlotEl] = React.useState<HTMLDivElement | null>(null);
  const visible = useIntersectionVisible(slotEl, scrollRoot);

  return (
    <div ref={setSlotEl} style={{ minHeight: placeholderHeight }} className="bg-[rgba(251,248,244,0.35)]">
      {visible ? (
        <PdfPageInner
          pdf={pdf}
          pageNumber={pageNumber}
          maxCssWidth={maxCssWidth}
          tool={tool}
          size={size}
          strokes={strokes}
          pageHighlights={pageHighlights}
          pageStickies={pageStickies}
          onStrokesChange={(next) => onStrokesChangeForPage(pageNumber, next)}
          onAddHighlight={onAddHighlight}
          onErasePage={onErasePage}
          onExcerpt={onExcerpt}
          onStickyCreate={onStickyCreate}
          onStickyPatch={onStickyPatch}
          onStickyDelete={onStickyDelete}
          onLayout={(h) => onHeight(pageNumber, h)}
        />
      ) : (
        <div
          className="flex items-center justify-center text-[11px] text-ink-muted"
          style={{ minHeight: placeholderHeight }}
        >
          Page {pageNumber}
        </div>
      )}
    </div>
  );
}

function emptyMarkup(): MarkupSnapshot {
  return { strokesByPage: {}, textHighlights: [] };
}

export function StudyPdfMarkupViewer({
  file,
  unitId,
  stickyNotes,
  onStickyNotesChange,
  onExcerpt,
}: {
  file: File;
  unitId: string | null;
  stickyNotes: StickyNoteDto[];
  onStickyNotesChange: React.Dispatch<React.SetStateAction<StickyNoteDto[]>>;
  onExcerpt: (text: string, force?: boolean) => void;
}) {
  const tool = useAnnotationToolbarStore((s) => s.tool);
  const setTool = useAnnotationToolbarStore((s) => s.setTool);
  const color = useAnnotationToolbarStore((s) => s.color);
  const setColor = useAnnotationToolbarStore((s) => s.setColor);
  const size = useAnnotationToolbarStore((s) => s.size);
  const setSize = useAnnotationToolbarStore((s) => s.setSize);

  const outerRef = React.useRef<HTMLDivElement>(null);
  const [scrollRoot, setScrollRoot] = React.useState<HTMLDivElement | null>(null);
  const [maxCssWidth, setMaxCssWidth] = React.useState(720);
  const [pdf, setPdf] = React.useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = React.useState(0);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const { present: markup, set: setMarkup, undo, redo, reset, clearHistory, canUndo, canRedo } =
    useMarkupSnapshotUndo(emptyMarkup());
  const pageHeightsRef = React.useRef<Map<number, number>>(new Map());
  const [, bumpHeights] = React.useState(0);
  const [persistReady, setPersistReady] = React.useState(false);
  const zoomRef = React.useRef(zoom);
  zoomRef.current = zoom;
  const pdfRef = React.useRef<PDFDocumentProxy | null>(null);
  const markupSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const onHeight = React.useCallback((page: number, h: number) => {
    const prev = pageHeightsRef.current.get(page);
    if (prev === h) return;
    pageHeightsRef.current.set(page, h);
    bumpHeights((n) => n + 1);
  }, []);

  React.useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 8;
      setMaxCssWidth(Math.max(280, Math.floor(w * zoomRef.current)));
    });
    ro.observe(el);
    const w = el.clientWidth - 8;
    setMaxCssWidth(Math.max(280, Math.floor(w * zoomRef.current)));
    return () => ro.disconnect();
  }, [zoom]);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setPersistReady(false);
    setPdf(null);
    setNumPages(0);
    reset(emptyMarkup());
    clearHistory();
    pageHeightsRef.current.clear();

    void pdfRef.current?.destroy().catch(() => {});
    pdfRef.current = null;

    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const pdfjs = await import("pdfjs-dist");
        configurePdfjsWorker(pdfjs);
        const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) {
          void doc.destroy().catch(() => {});
          return;
        }
        pdfRef.current = doc;
        setPdf(doc);
        setNumPages(doc.numPages);

        if (unitId && studyApiConfigured()) {
          try {
            const m = await getPdfMarkup(unitId);
            const p = m.payload ?? {};
            const sbp: Record<number, NoteStroke[]> = {};
            const rawSp = p.strokes_by_page;
            if (rawSp && typeof rawSp === "object") {
              for (const [k, v] of Object.entries(rawSp)) {
                const n = Number(k);
                if (!Number.isFinite(n) || !Array.isArray(v)) continue;
                sbp[n] = v as NoteStroke[];
              }
            }
            const th = Array.isArray(p.text_highlights) ? (p.text_highlights as PdfTextHighlightDto[]) : [];
            reset({ strokesByPage: sbp, textHighlights: th });
          } catch {
            reset(emptyMarkup());
          }
        }
        if (!cancelled) setPersistReady(true);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not open PDF");
      }
    })();

    return () => {
      cancelled = true;
      void pdfRef.current?.destroy().catch(() => {});
      pdfRef.current = null;
    };
  }, [file, unitId, reset, clearHistory]);

  React.useEffect(() => {
    if (!persistReady || !unitId || !studyApiConfigured()) return;
    if (markupSaveTimer.current) clearTimeout(markupSaveTimer.current);
    markupSaveTimer.current = setTimeout(() => {
      const strokes_by_page: Record<string, NoteStroke[]> = {};
      for (const [k, v] of Object.entries(markup.strokesByPage)) strokes_by_page[String(k)] = v;
      const payload: PdfMarkupPayload = {
        strokes_by_page: strokes_by_page,
        text_highlights: markup.textHighlights,
      };
      void putPdfMarkup(unitId, payload).catch(() => {});
    }, 600);
    return () => {
      if (markupSaveTimer.current) clearTimeout(markupSaveTimer.current);
    };
  }, [markup, persistReady, unitId]);

  const onStrokesChangeForPage = React.useCallback(
    (page: number, next: NoteStroke[]) => {
      setMarkup((prev) => ({
        ...prev,
        strokesByPage: { ...prev.strokesByPage, [page]: next },
      }));
    },
    [setMarkup],
  );

  const onAddHighlight = React.useCallback(
    (hl: PdfTextHighlightDto) => {
      setMarkup((prev) => ({
        ...prev,
        textHighlights: [...prev.textHighlights, hl],
      }));
    },
    [setMarkup],
  );

  const onErasePage = React.useCallback(
    (page: number, xr: number, yr: number, cw: number, ch: number) => {
      setMarkup((prev) => {
        const strokes = prev.strokesByPage[page] ?? [];
        const nextStrokes = hitStrokeRemove(strokes, xr * cw, yr * ch);
        const nextHighlights = prev.textHighlights.filter((h) => {
          if (h.page_number !== page) return true;
          return !h.rects.some((r) => xr >= r.x && xr <= r.x + r.w && yr >= r.y && yr <= r.y + r.h);
        });
        return {
          strokesByPage: { ...prev.strokesByPage, [page]: nextStrokes },
          textHighlights: nextHighlights,
        };
      });
    },
    [setMarkup],
  );

  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setScrollRoot(rootRef.current);
  }, [pdf, numPages]);

  const onStickyCreate = React.useCallback(
    async (page: number, x: number, y: number) => {
      if (!unitId || !studyApiConfigured()) return;
      try {
        const row = await createStickyNote(unitId, { page_number: page, x_position: x, y_position: y, content: "" });
        onStickyNotesChange((prev) => [...prev, row]);
      } catch {
        /* ignore */
      }
    },
    [unitId, onStickyNotesChange],
  );

  const onStickyPatch = React.useCallback(
    async (id: string, body: { x_position?: number; y_position?: number; content?: string }) => {
      onStickyNotesChange((prev) => prev.map((n) => (n.id === id ? { ...n, ...body } : n)));
      if (!unitId || !studyApiConfigured()) return;
      try {
        const row = await patchStickyNote(unitId, id, body);
        onStickyNotesChange((prev) => prev.map((n) => (n.id === row.id ? row : n)));
      } catch {
        /* ignore */
      }
    },
    [unitId, onStickyNotesChange],
  );

  const onStickyDelete = React.useCallback(
    async (id: string) => {
      if (!unitId || !studyApiConfigured()) {
        onStickyNotesChange((prev) => prev.filter((n) => n.id !== id));
        return;
      }
      try {
        await deleteStickyNote(unitId, id);
        onStickyNotesChange((prev) => prev.filter((n) => n.id !== id));
      } catch {
        /* ignore */
      }
    },
    [unitId, onStickyNotesChange],
  );

  const clearMarkup = React.useCallback(() => {
    setMarkup(emptyMarkup());
    clearHistory();
  }, [clearHistory, setMarkup]);

  const placeholderHeight = (page: number) => pageHeightsRef.current.get(page) ?? 960;

  if (loadError) {
    return (
      <div className="flex min-h-[42dvh] items-center justify-center px-4 text-center text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  if (!pdf || numPages < 1) {
    return (
      <div className="flex min-h-[42dvh] items-center justify-center text-sm text-ink-muted">Loading PDF…</div>
    );
  }

  return (
    <div ref={outerRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-[rgba(120,90,80,0.08)] bg-[rgba(251,248,244,0.88)] px-2 py-2">
        <div className="flex min-w-0 flex-wrap items-start gap-2">
          <div className="min-w-0 min-w-[200px] flex-1">
            <NotesToolbar
              variant="study-pdf"
              showPaper={false}
              showExportSave={false}
              tool={tool}
              onToolChange={setTool}
              color={color}
              onColorChange={setColor}
              size={size}
              onSizeChange={setSize}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onClear={clearMarkup}
              onSave={() => {
                if (!unitId || !studyApiConfigured()) return;
                const strokes_by_page: Record<string, NoteStroke[]> = {};
                for (const [k, v] of Object.entries(markup.strokesByPage)) strokes_by_page[String(k)] = v;
                void putPdfMarkup(unitId, {
                  strokes_by_page: strokes_by_page,
                  text_highlights: markup.textHighlights,
                });
              }}
              onExportPng={() => {}}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 self-center rounded-lg border border-[rgba(120,90,80,0.1)] bg-surface-panel/90 px-1 py-0.5 shadow-sm">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-black/[0.04]"
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(0.75, Math.round((z - 0.1) * 100) / 100))}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[2.75rem] text-center text-[11px] text-ink-muted">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-black/[0.04]"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 100) / 100))}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="text-[10px] leading-snug text-ink-muted">
          {tool === "select"
            ? "Select text to sync an excerpt to the study panel."
            : tool === "highlighter"
              ? "Drag to select text — a soft highlight is added and the excerpt syncs."
              : tool === "sticky"
                ? "Tap the page to drop a sticky note. Drag the card to reposition."
                : "Drag on ink marks to erase strokes, or tap a highlight region to clear it."}
          {!unitId || !studyApiConfigured()
            ? " Sign in to the study API to sync stickies and highlights."
            : null}
        </p>
      </div>

      <div ref={rootRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2">
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
          <PdfPageSlot
            key={pageNumber}
            pdf={pdf}
            pageNumber={pageNumber}
            scrollRoot={scrollRoot}
            maxCssWidth={maxCssWidth}
            placeholderHeight={placeholderHeight(pageNumber)}
            onHeight={onHeight}
            onStrokesChangeForPage={onStrokesChangeForPage}
            tool={tool}
            size={size}
            strokes={markup.strokesByPage[pageNumber] ?? []}
            pageHighlights={markup.textHighlights.filter((h) => h.page_number === pageNumber)}
            pageStickies={stickyNotes.filter((n) => n.page_number === pageNumber)}
            onAddHighlight={onAddHighlight}
            onErasePage={onErasePage}
            onExcerpt={onExcerpt}
            onStickyCreate={onStickyCreate}
            onStickyPatch={onStickyPatch}
            onStickyDelete={onStickyDelete}
          />
        ))}
      </div>
    </div>
  );
}
