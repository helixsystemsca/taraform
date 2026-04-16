"use client";

import * as React from "react";

import type { NoteStroke, NotesTool } from "@/components/notes/types";
import { useCanvasDrawing } from "@/hooks/useCanvasDrawing";
import { cn } from "@/lib/utils";

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
  tool: NotesTool;
  color: string;
  size: number;
  paperStyle?: PaperStyle;
  paperOpacity?: number;
  className?: string;
  onExportPngReady?: (fn: () => string | null) => void;
}) {
  const { bind, exportPng } = useCanvasDrawing({
    strokes,
    onChangeStrokes,
    toolState: { tool, color, size },
    renderOptions: { paperPaddingPx: 36 },
  });

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
  const lastCursorRef = React.useRef<{ x: number; y: number; type: NotesTool; size: number } | null>(null);

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
      el.style.background = last.type === "eraser" ? "rgba(17,24,39,0.08)" : "transparent";
      el.style.border = last.type === "eraser" ? "1px solid rgba(17,24,39,0.28)" : "1px solid rgba(17,24,39,0.55)";
      el.style.boxShadow = "0 4px 16px rgba(15,23,42,0.12)";
    });
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    bind.onPointerMove?.(e);
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastCursorRef.current = { x, y, type: tool, size };
    cursorVisibleRef.current = true;
    scheduleCursorUpdate();
  }

  function onPointerEnter() {
    cursorVisibleRef.current = true;
    scheduleCursorUpdate();
  }

  function onPointerLeave(e: React.PointerEvent<HTMLCanvasElement>) {
    bind.onPointerLeave?.(e);
    cursorVisibleRef.current = false;
    scheduleCursorUpdate();
  }

  React.useEffect(() => {
    onExportPngReady?.(() => exportPng({ background: "#fdfaf6" }));
  }, [exportPng, onExportPngReady]);

  return (
    <div
      className={cn(
        "canvas-wrapper relative h-full w-full overflow-hidden rounded-[22px] border border-stone-200/70 bg-[#fdfaf6] shadow-[0_12px_38px_rgba(15,23,42,0.12)]",
        className,
      )}
    >
      {paperStyle === "lined" ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: paperOpacity,
            backgroundImage: "linear-gradient(0deg, rgba(17,24,39,0.42) 1px, transparent 1px)",
            backgroundSize: "100% 24px",
          }}
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 50% 10%, rgba(255,255,255,0.85), rgba(255,255,255,0.35) 45%, rgba(0,0,0,0) 70%)",
          mixBlendMode: "soft-light",
        }}
      />

      <canvas
        {...bind}
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        className={cn("absolute inset-0 h-full w-full touch-none", "cursor-none")}
        aria-label="Handwritten notes canvas"
      />

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

