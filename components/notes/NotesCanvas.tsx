"use client";

import * as React from "react";

import type { NoteStroke, NotesTool } from "@/components/notes/types";
import { useCanvasDrawing } from "@/hooks/useCanvasDrawing";
import { cn } from "@/lib/utils";

export function NotesCanvas({
  strokes,
  onChangeStrokes,
  tool,
  color,
  size,
  className,
  onExportPngReady,
}: {
  strokes: NoteStroke[];
  onChangeStrokes: (next: NoteStroke[] | ((prev: NoteStroke[]) => NoteStroke[]), opts?: { replace?: boolean }) => void;
  tool: NotesTool;
  color: string;
  size: number;
  className?: string;
  onExportPngReady?: (fn: () => string | null) => void;
}) {
  const { bind, exportPng } = useCanvasDrawing({
    strokes,
    onChangeStrokes,
    toolState: { tool, color, size },
    renderOptions: { paperPaddingPx: 36 },
  });

  React.useEffect(() => {
    onExportPngReady?.(() => exportPng({ background: "#fdfaf6" }));
  }, [exportPng, onExportPngReady]);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[22px] border border-stone-200/70 bg-[#fdfaf6] shadow-[0_12px_38px_rgba(15,23,42,0.12)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.38]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(17,24,39,0.09) 0.65px, transparent 0.75px), radial-gradient(rgba(217,119,6,0.05) 0.65px, transparent 0.75px)",
          backgroundSize: "18px 18px, 18px 18px",
          backgroundPosition: "0 0, 9px 9px",
          filter: "blur(0.1px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(0deg, rgba(17,24,39,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,0.04) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
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
        className={cn("absolute inset-0 h-full w-full touch-none", "cursor-none")}
        aria-label="Handwritten notes canvas"
      />
    </div>
  );
}

