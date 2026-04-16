"use client";

import * as React from "react";
import { Eraser, Highlighter, Paintbrush2, Redo2, Trash2, Undo2, Download, Save } from "lucide-react";

import type { NotesTool } from "@/components/notes/types";
import { cn } from "@/lib/utils";

const PASTEL_COLORS = [
  "#CDB4DB", // lavender
  "#FFC8DD", // blush pink
  "#BDE0FE", // soft blue
  "#A2D2FF", // sky blue
  "#CDEAC0", // soft green
  "#FFD6A5", // peach
  "#FDFFB6", // soft yellow
  "#E2F0CB", // pale lime
  "#F1C0E8", // light purple pink
];

type PaperStyle = "blank" | "lined" | "dots";

export function NotesToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  size,
  onSizeChange,
  paperStyle,
  paperOpacity,
  onPaperStyleChange,
  onPaperOpacityChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onExportPng,
}: {
  tool: NotesTool;
  onToolChange: (t: NotesTool) => void;
  color: string;
  onColorChange: (c: string) => void;
  size: number;
  onSizeChange: (n: number) => void;
  paperStyle?: PaperStyle;
  paperOpacity?: number;
  onPaperStyleChange?: (s: PaperStyle) => void;
  onPaperOpacityChange?: (n: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onExportPng: () => void;
}) {
  const style = paperStyle ?? "dots";
  const opacity = paperOpacity ?? 0.18;

  function setPaper(next: { style?: PaperStyle; opacity?: number }) {
    const nextStyle = next.style ?? style;
    const nextOpacity = next.opacity ?? opacity;
    onPaperStyleChange?.(nextStyle);
    onPaperOpacityChange?.(nextOpacity);
    window.dispatchEvent(
      new CustomEvent("taraform:paper", { detail: { style: nextStyle, opacity: nextOpacity } }),
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-auto",
        "flex flex-wrap items-center gap-2 rounded-full border border-stone-200/70 bg-white/70 px-3 py-2 shadow-sm shadow-stone-900/10 backdrop-blur-xl",
      )}
    >
      <ToolButton active={tool === "pen"} label="Pen" onClick={() => onToolChange("pen")}>
        <Paintbrush2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        active={tool === "highlighter"}
        label="Highlighter"
        onClick={() => onToolChange("highlighter")}
      >
        <Highlighter className="h-4 w-4" />
      </ToolButton>
      <ToolButton active={tool === "eraser"} label="Eraser" onClick={() => onToolChange("eraser")}>
        <Eraser className="h-4 w-4" />
      </ToolButton>

      <div className="mx-1 h-6 w-px bg-stone-200/80" />

      <div className="flex items-center gap-1.5">
        {PASTEL_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={cn(
              "h-6 w-6 rounded-full border border-stone-300/70 shadow-sm shadow-stone-900/5 transition",
              c === color ? "ring-2 ring-copper/40 ring-offset-2 ring-offset-white/40" : "hover:scale-[1.03]",
            )}
            style={{ background: c }}
            aria-label={`Set color ${c}`}
            onClick={() => onColorChange(c)}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded-full border border-stone-200/70 bg-transparent p-0"
          aria-label="Pick custom color"
        />
      </div>

      <div className="mx-1 h-6 w-px bg-stone-200/80" />

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={2}
          max={26}
          step={1}
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="w-28 accent-copper"
          aria-label="Stroke size"
        />
        <div className="min-w-9 text-right text-xs font-medium tabular-nums text-ink/60">{size}px</div>
      </div>

      <div className="mx-1 h-6 w-px bg-stone-200/80" />

      <div className="flex items-center gap-1">
        <ToolButton active={style === "blank"} label="Blank" onClick={() => setPaper({ style: "blank" })}>
          <span className="h-3 w-3 rounded-sm border border-stone-300/80 bg-white/70" />
        </ToolButton>
        <ToolButton active={style === "lined"} label="Lined" onClick={() => setPaper({ style: "lined" })}>
          <span className="relative h-3 w-3 rounded-sm border border-stone-300/80 bg-white/70">
            <span className="absolute left-0.5 right-0.5 top-1/2 h-px -translate-y-1/2 bg-ink/35" />
          </span>
        </ToolButton>
        <ToolButton active={style === "dots"} label="Dots" onClick={() => setPaper({ style: "dots" })}>
          <span className="relative h-3 w-3 rounded-sm border border-stone-300/80 bg-white/70">
            <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/35" />
          </span>
        </ToolButton>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={0.3}
          step={0.01}
          value={opacity}
          onChange={(e) => setPaper({ opacity: Number(e.target.value) })}
          className="w-24 accent-copper"
          aria-label="Paper opacity"
        />
        <div className="min-w-9 text-right text-xs font-medium tabular-nums text-ink/60">
          {(opacity * 100).toFixed(0)}%
        </div>
      </div>

      <div className="mx-1 h-6 w-px bg-stone-200/80" />

      <ToolButton label="Undo" disabled={!canUndo} onClick={onUndo}>
        <Undo2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Redo" disabled={!canRedo} onClick={onRedo}>
        <Redo2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Clear" onClick={onClear}>
        <Trash2 className="h-4 w-4" />
      </ToolButton>

      <div className="mx-1 h-6 w-px bg-stone-200/80" />

      <ToolButton label="Export PNG" onClick={onExportPng}>
        <Download className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Save" onClick={onSave}>
        <Save className="h-4 w-4" />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition",
        "border border-transparent hover:bg-blush-medium/50 disabled:opacity-40 disabled:hover:bg-transparent",
        active ? "border-blush-dust/45 bg-blush-sheet/80 text-ink" : "text-ink/70",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

