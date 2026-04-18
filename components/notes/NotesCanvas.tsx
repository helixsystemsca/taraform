"use client";

import * as React from "react";
import { X } from "lucide-react";

import type { AnnotationTool } from "@/lib/annotations";
import { parseSelectionKey, strokeBBox } from "@/lib/annotations";
import type { NoteStroke } from "@/components/notes/types";
import { useCanvasDrawing } from "@/hooks/useCanvasDrawing";
import { cn } from "@/lib/utils";
import { useAnnotationToolbarStore } from "@/stores/useAnnotationToolbarStore";

type PaperStyle = "blank" | "lined";

export function NotesCanvas({
  strokes,
  onChangeStrokes,
  tool,
  color,
  size,
  paperStyle: paperStyleProp,
  paperOpacity: paperOpacityProp,
  className,
  onExportPngReady,
}: {
  strokes: NoteStroke[];
  onChangeStrokes: (next: NoteStroke[] | ((prev: NoteStroke[]) => NoteStroke[]), opts?: { replace?: boolean }) => void;
  tool: AnnotationTool;
  color: string;
  size: number;
  paperStyle?: PaperStyle;
  paperOpacity?: number;
  className?: string;
  onExportPngReady?: (fn: () => string | null) => void;
}) {
  const canvasElRef = React.useRef<HTMLCanvasElement | null>(null);
  const selectedAnnotationId = useAnnotationToolbarStore((s) => s.selectedAnnotationId);
  const clearSelection = useAnnotationToolbarStore((s) => s.clearSelection);

  const { bind, exportPng } = useCanvasDrawing({
    strokes,
    onChangeStrokes,
    toolState: { tool, color, size },
    renderOptions: { paperPaddingPx: 36 },
  });

  const setCanvasRef = React.useCallback(
    (el: HTMLCanvasElement | null) => {
      canvasElRef.current = el;
      const r = bind.ref as React.MutableRefObject<HTMLCanvasElement | null>;
      r.current = el;
    },
    [bind.ref],
  );

  const [paperStyle, setPaperStyle] = React.useState<PaperStyle>(paperStyleProp ?? "blank");
  const [paperOpacity, setPaperOpacity] = React.useState<number>(paperOpacityProp ?? 0.18);

  React.useEffect(() => {
    if (paperStyleProp) setPaperStyle(paperStyleProp);
  }, [paperStyleProp]);
  React.useEffect(() => {
    if (paperOpacityProp != null) setPaperOpacity(paperOpacityProp);
  }, [paperOpacityProp]);

  React.useEffect(() => {
    const onPaper = (e: Event) => {
      const detail = (e as CustomEvent<{ style?: PaperStyle; opacity?: number }>).detail;
      if (!detail) return;
      if (detail.style) setPaperStyle(detail.style);
      if (detail.opacity != null) setPaperOpacity(detail.opacity);
    };
    window.addEventListener("taraform:paper", onPaper as EventListener);
    return () => window.removeEventListener("taraform:paper", onPaper as EventListener);
  }, []);

  const cursorRef = React.useRef<HTMLDivElement | null>(null);
  const cursorRafRef = React.useRef<number | null>(null);
  const cursorVisibleRef = React.useRef(false);
  const lastCursorRef = React.useRef<{ x: number; y: number; type: AnnotationTool; size: number } | null>(null);

  function scheduleCursorUpdate() {
    if (cursorRafRef.current != null) return;
    cursorRafRef.current = window.requestAnimationFrame(() => {
      cursorRafRef.current = null;
      const el = cursorRef.current;
      const last = lastCursorRef.current;
      if (!el || !last) return;

      const px = Math.max(6, Math.min(56, last.size * (last.type === "eraser" ? 2.0 : last.type === "highlighter" ? 1.4 : 1.1)));
      const left = last.x - px / 2;
      const top = last.y - px / 2;

      el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      el.style.width = `${px}px`;
      el.style.height = `${px}px`;
      el.style.borderRadius = last.type === "highlighter" ? "10px" : "9999px";
      el.style.opacity = cursorVisibleRef.current ? "1" : "0";
      el.style.background = last.type === "eraser" ? "rgba(120,90,80,0.08)" : "transparent";
      el.style.border = last.type === "eraser" ? "1px solid rgba(120,90,80,0.22)" : "1px solid rgba(120,90,80,0.45)";
      el.style.boxShadow = "0 4px 16px rgba(120,90,80,0.12)";
    });
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    bind.onPointerMove?.(e);
    if (tool === "select" || tool === "sticky") return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastCursorRef.current = { x, y, type: tool, size };
    cursorVisibleRef.current = true;
    scheduleCursorUpdate();
  }

  function onPointerEnter() {
    if (tool === "select" || tool === "sticky") return;
    cursorVisibleRef.current = true;
    scheduleCursorUpdate();
  }

  function onPointerLeave(e: React.PointerEvent<HTMLCanvasElement>) {
    bind.onPointerLeave?.(e);
    cursorVisibleRef.current = false;
    scheduleCursorUpdate();
  }

  React.useEffect(() => {
    onExportPngReady?.(() => exportPng({ background: "#fbf8f4" }));
  }, [exportPng, onExportPngReady]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement;
      if (t.closest("textarea, input, [contenteditable=true]")) return;
      const id = useAnnotationToolbarStore.getState().selectedAnnotationId;
      if (!id) return;
      const parsed = parseSelectionKey(id);
      if (!parsed || parsed.kind !== "stroke" || parsed.page !== 0) return;
      e.preventDefault();
      onChangeStrokes((prev) => prev.filter((s) => s.id !== parsed.id));
      clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearSelection, onChangeStrokes]);

  const canvasCursor =
    tool === "select"
      ? "default"
      : tool === "pen"
        ? "crosshair"
        : tool === "highlighter"
          ? "text"
          : tool === "sticky"
            ? "cell"
            : tool === "eraser"
              ? "none"
              : "default";

  const selectionParsed = parseSelectionKey(selectedAnnotationId);
  const selectedStroke =
    selectionParsed?.kind === "stroke" && selectionParsed.page === 0
      ? strokes.find((s) => s.id === selectionParsed.id && s.tool !== "eraser")
      : undefined;

  const canvas = canvasElRef.current;
  const cw = canvas?.width ?? 1;
  const ch = canvas?.height ?? 1;
  const box = selectedStroke ? strokeBBox(selectedStroke.points) : null;

  return (
    <div
      className={cn(
        "canvas-wrapper relative h-full w-full overflow-hidden rounded-xl border border-[rgba(120,90,80,0.1)] bg-surface-page shadow-warm",
        className,
      )}
    >
      {paperStyle === "lined" ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: paperOpacity,
            backgroundImage: "linear-gradient(0deg, rgba(120,90,80,0.28) 1px, transparent 1px)",
            backgroundSize: "100% 24px",
          }}
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 50% 10%, rgba(251,248,244,0.9), rgba(246,242,236,0.45) 45%, rgba(0,0,0,0) 70%)",
          mixBlendMode: "soft-light",
        }}
      />

      <canvas
        {...bind}
        ref={setCanvasRef}
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        className={cn("absolute inset-0 h-full w-full touch-none", tool === "eraser" ? "cursor-none" : canvasCursor)}
        aria-label="Handwritten notes canvas"
      />

      {tool === "select" && box && selectedStroke ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 animate-[tara-selection-in_140ms_ease-out_forwards]"
          aria-hidden
        >
          <div
            className="pointer-events-none absolute rounded-md border border-copper/35 bg-copper/[0.04] shadow-[0_0_0_1px_rgba(197,143,143,0.12)]"
            style={{
              left: `${(box.minX / cw) * 100}%`,
              top: `${(box.minY / ch) * 100}%`,
              width: `${((box.maxX - box.minX) / cw) * 100}%`,
              height: `${((box.maxY - box.minY) / ch) * 100}%`,
            }}
          />
          <button
            type="button"
            aria-label="Delete stroke"
            className="pointer-events-auto absolute flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(120,90,80,0.15)] bg-surface-panel/95 text-ink-secondary shadow-warm backdrop-blur-sm transition-colors hover:bg-rose-light/60 hover:text-ink"
            style={{
              left: `${(box.maxX / cw) * 100}%`,
              top: `${(box.minY / ch) * 100}%`,
              transform: "translate(-60%, -55%)",
            }}
            onClick={(ev) => {
              ev.stopPropagation();
              onChangeStrokes((prev) => prev.filter((s) => s.id !== selectedStroke.id));
              clearSelection();
            }}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      ) : null}

      <div
        ref={cursorRef}
        className="pointer-events-none absolute left-0 top-0 z-20 opacity-0 transition-opacity duration-75"
        style={{
          transform: "translate3d(-9999px, -9999px, 0)",
          width: 14,
          height: 14,
          borderRadius: 9999,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
