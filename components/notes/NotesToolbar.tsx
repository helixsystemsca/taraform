"use client";

import * as React from "react";
import { Eraser, Highlighter, Paintbrush2, Redo2, Trash2, Undo2, Download, Save } from "lucide-react";

import type { NotesTool } from "@/components/notes/types";
import { cn } from "@/lib/utils";

export const pastelColors = [
  "#CDB4DB",
  "#FFC8DD",
  "#BDE0FE",
  "#A2D2FF",
  "#CDEAC0",
  "#FFD6A5",
  "#FDFFB6",
  "#E2F0CB",
  "#F1C0E8",
];

type PaperStyle = "blank" | "lined";

/** Shared control height (40px) — buttons, segmented control shell, slider rows. */
const CONTROL_H = "h-10 min-h-10";
const SECTION_GAP = "gap-3 sm:gap-4";

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
  const style = paperStyle ?? "blank";
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
        "pointer-events-auto w-full min-w-0 max-w-full rounded-xl border border-stone-200/70",
        "bg-white/80 px-3 py-2.5 shadow-md shadow-stone-900/10 backdrop-blur-xl sm:px-4",
        "overflow-x-auto [scrollbar-width:thin]",
      )}
    >
      <div
        className={cn(
          "flex w-max min-w-full flex-nowrap items-center justify-between",
          SECTION_GAP,
        )}
      >
        {/* LEFT — drawing tools */}
        <div className={cn("flex shrink-0 items-center", SECTION_GAP)} aria-label="Drawing tools">
          <ToolButton active={tool === "pen"} label="Pen" onClick={() => onToolChange("pen")}>
            <Paintbrush2 className="h-4 w-4 shrink-0" />
          </ToolButton>
          <ToolButton
            active={tool === "highlighter"}
            label="Highlighter"
            onClick={() => onToolChange("highlighter")}
          >
            <Highlighter className="h-4 w-4 shrink-0" />
          </ToolButton>
          <ToolButton active={tool === "eraser"} label="Eraser" onClick={() => onToolChange("eraser")}>
            <Eraser className="h-4 w-4 shrink-0" />
          </ToolButton>
        </div>

        {/* CENTER — color + stroke size */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-nowrap items-center justify-center",
            SECTION_GAP,
          )}
          aria-label="Color and stroke"
        >
          <div className={cn("flex flex-nowrap items-center", "gap-2")}>
            {pastelColors.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "size-[22px] shrink-0 rounded-full border border-stone-300/70 shadow-sm shadow-stone-900/5 transition",
                  c === color ? "ring-2 ring-copper/40 ring-offset-2 ring-offset-white/90" : "hover:scale-[1.04]",
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
              className={cn(
                "size-[22px] shrink-0 cursor-pointer rounded-full border border-stone-200/70 bg-transparent p-0",
                "self-center",
              )}
              aria-label="Pick custom color"
            />
          </div>

          <div className={cn("flex flex-nowrap items-center", "gap-2")}>
            <span className="hidden shrink-0 text-xs font-medium text-ink/50 sm:inline">Size</span>
            <div className={cn("flex shrink-0 items-center", CONTROL_H)}>
              <input
                type="range"
                min={2}
                max={26}
                step={1}
                value={size}
                onChange={(e) => onSizeChange(Number(e.target.value))}
                className="h-4 w-[128px] cursor-pointer accent-copper sm:w-[152px]"
                aria-label="Stroke size"
              />
            </div>
            <span
              className={cn(
                CONTROL_H,
                "inline-flex w-9 shrink-0 items-center justify-end text-xs font-medium tabular-nums text-ink/60",
              )}
            >
              {size}px
            </span>
          </div>
        </div>

        {/* RIGHT — paper, opacity, actions */}
        <div
          className={cn("flex shrink-0 flex-nowrap items-center", SECTION_GAP)}
          aria-label="Paper and actions"
        >
          <div
            className={cn(
              "flex shrink-0 items-stretch rounded-lg border border-stone-200/70 bg-stone-100/50 p-1",
              CONTROL_H,
            )}
            role="group"
            aria-label="Paper style"
          >
            <button
              type="button"
              onClick={() => setPaper({ style: "blank" })}
              className={cn(
                "inline-flex min-w-[2.25rem] flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition sm:min-w-0",
                style === "blank" ? "bg-white text-ink shadow-sm shadow-stone-900/8" : "text-ink/60 hover:text-ink",
              )}
              aria-pressed={style === "blank"}
            >
              <span className="size-3 shrink-0 rounded-sm border border-stone-300/80 bg-white/90" aria-hidden />
              <span className="hidden sm:inline">Blank</span>
            </button>
            <button
              type="button"
              onClick={() => setPaper({ style: "lined" })}
              className={cn(
                "inline-flex min-w-[2.25rem] flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition sm:min-w-0",
                style === "lined" ? "bg-white text-ink shadow-sm shadow-stone-900/8" : "text-ink/60 hover:text-ink",
              )}
              aria-pressed={style === "lined"}
            >
              <span
                className="flex size-3 shrink-0 items-center justify-center rounded-sm border border-stone-300/80 bg-white/90"
                aria-hidden
              >
                <span className="h-px w-2 bg-ink/40" />
              </span>
              <span className="hidden sm:inline">Lined</span>
            </button>
          </div>

          <div className={cn("flex flex-nowrap items-center", "gap-2")}>
            <span className="hidden shrink-0 text-xs font-medium text-ink/50 lg:inline">Paper</span>
            <div className={cn("flex shrink-0 items-center", CONTROL_H)}>
              <input
                type="range"
                min={0}
                max={0.3}
                step={0.01}
                value={opacity}
                onChange={(e) => setPaper({ opacity: Number(e.target.value) })}
                className="h-4 w-[120px] shrink-0 cursor-pointer accent-copper sm:w-[136px]"
                aria-label="Paper opacity"
              />
            </div>
            <span
              className={cn(
                CONTROL_H,
                "inline-flex w-9 shrink-0 items-center justify-end text-xs font-medium tabular-nums text-ink/60",
              )}
            >
              {(opacity * 100).toFixed(0)}%
            </span>
          </div>

          <span className="hidden h-6 w-px shrink-0 self-center bg-stone-200/80 sm:block" aria-hidden />

          <div className={cn("flex flex-nowrap items-center", "gap-2")}>
            <ToolButton label="Undo" disabled={!canUndo} onClick={onUndo}>
              <Undo2 className="h-4 w-4 shrink-0" />
            </ToolButton>
            <ToolButton label="Redo" disabled={!canRedo} onClick={onRedo}>
              <Redo2 className="h-4 w-4 shrink-0" />
            </ToolButton>
            <ToolButton label="Clear" onClick={onClear}>
              <Trash2 className="h-4 w-4 shrink-0" />
            </ToolButton>
          </div>

          <div className={cn("flex flex-nowrap items-center", "gap-2")}>
            <ToolButton label="Export PNG" onClick={onExportPng}>
              <Download className="h-4 w-4 shrink-0" />
            </ToolButton>
            <ToolButton label="Save" onClick={onSave}>
              <Save className="h-4 w-4 shrink-0" />
            </ToolButton>
          </div>
        </div>
      </div>
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
      aria-pressed={active === undefined ? undefined : active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium leading-none transition",
        "border border-transparent",
        "disabled:pointer-events-none disabled:opacity-40",
        active
          ? "border-copper/35 bg-blush-sheet/95 text-ink shadow-sm shadow-stone-900/8"
          : "text-ink/75 hover:bg-stone-100/85 hover:text-ink",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
