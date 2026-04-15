"use client";

import * as React from "react";
import type { CanvasPath } from "react-sketch-canvas";
import { ReactSketchCanvas, type ReactSketchCanvasRef } from "react-sketch-canvas";

import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  sectionId: string;
  textNote: string;
  sketchPathsJson: string | undefined;
  onTextChange: (text: string) => void;
  onSketchJsonChange: (json: string) => void;
};

export function SectionNotesPanel({
  sectionId,
  textNote,
  sketchPathsJson,
  onTextChange,
  onSketchJsonChange,
}: Props) {
  const canvasRef = React.useRef<ReactSketchCanvasRef>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sketchSnapshotRef = React.useRef(sketchPathsJson);
  sketchSnapshotRef.current = sketchPathsJson;

  const schedulePersistSketch = React.useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const c = canvasRef.current;
      if (!c) return;
      try {
        const paths = await c.exportPaths();
        onSketchJsonChange(JSON.stringify(paths));
      } catch {
        /* ignore export errors */
      }
    }, 450);
  }, [onSketchJsonChange]);

  React.useEffect(() => {
    return () => clearTimeout(saveTimer.current);
  }, []);

  React.useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const json = sketchSnapshotRef.current;
    if (!json) {
      c.resetCanvas();
      return;
    }
    try {
      const parsed = JSON.parse(json) as CanvasPath[];
      if (Array.isArray(parsed)) c.loadPaths(parsed);
    } catch {
      c.resetCanvas();
    }
  }, [sectionId]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard className="p-5">
        <div className="text-sm font-medium text-white/90">Typed notes</div>
        <p className="mt-1 text-xs text-white/50">Fallback editor — auto-saves as you type.</p>
        <Textarea
          className="mt-3 min-h-[200px]"
          value={textNote}
          placeholder="Summarize in your own words, add mnemonics, or paste highlights…"
          onChange={(e) => onTextChange(e.target.value)}
        />
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium text-white/90">Handwriting</div>
            <p className="mt-1 text-xs text-white/50">True pen strokes — saved as vector paths.</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => canvasRef.current?.undo()}
            >
              Undo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => canvasRef.current?.redo()}
            >
              Redo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => {
                canvasRef.current?.clearCanvas();
                onSketchJsonChange("[]");
              }}
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-white/12">
          <ReactSketchCanvas
            key={sectionId}
            ref={canvasRef}
            width="100%"
            height="360px"
            strokeWidth={3}
            strokeColor="rgba(236, 254, 255, 0.92)"
            canvasColor="rgba(0, 0, 0, 0.18)"
            onStroke={() => schedulePersistSketch()}
          />
        </div>
      </GlassCard>
    </div>
  );
}
