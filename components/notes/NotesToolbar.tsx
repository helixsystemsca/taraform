"use client";

import * as React from "react";
import Link from "next/link";
import {
  Download,
  Eraser,
  Highlighter,
  Home,
  MousePointer2,
  Paintbrush2,
  Redo2,
  Save,
  StickyNote,
  Trash2,
  Undo2,
} from "lucide-react";

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

const ROW = "flex h-9 min-h-9 shrink-0 items-center";

export function NotesToolbar({
  variant = "notepad",
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
  showPaper = true,
  showExportSave = true,
}: {
  variant?: "notepad" | "study-pdf";
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
  /** When false, hides lined/blank + opacity (e.g. study PDF). */
  showPaper?: boolean;
  /** When false, hides export + save (e.g. study PDF uses its own persistence). */
  showExportSave?: boolean;
}) {
  const isPdf = variant === "study-pdf";
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
        "pointer-events-auto w-full min-w-0 rounded-xl border border-[rgba(120,90,80,0.1)]",
        "bg-surface-panel/95 px-1.5 py-1 shadow-warm backdrop-blur-xl",
        "overflow-x-auto overflow-y-hidden",
      )}
    >
      <div className={cn("flex w-max min-w-full flex-nowrap items-center gap-1 sm:gap-1.5")}>
        <Link
          href="/home"
          className={cn(
            ROW,
            "w-9 justify-center rounded-lg border border-transparent text-ink-secondary transition-editorial",
            "hover:border-[rgba(120,90,80,0.12)] hover:bg-black/[0.04] hover:text-ink",
          )}
          aria-label="Home"
        >
          <Home className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        </Link>

        <span className="h-5 w-px shrink-0 bg-[rgba(120,90,80,0.12)]" aria-hidden />

        <div className={cn(ROW, "gap-0.5")} aria-label={isPdf ? "PDF annotation tools" : "Drawing tools"}>
          {isPdf ? (
            <>
              <ToolButton active={tool === "select"} label="Select text" onClick={() => onToolChange("select")}>
                <MousePointer2 className="h-4 w-4 shrink-0" />
              </ToolButton>
              <ToolButton
                active={tool === "highlighter"}
                label="Highlight text"
                onClick={() => onToolChange("highlighter")}
              >
                <Highlighter className="h-4 w-4 shrink-0" />
              </ToolButton>
              <ToolButton active={tool === "sticky"} label="Sticky note" onClick={() => onToolChange("sticky")}>
                <StickyNote className="h-4 w-4 shrink-0" />
              </ToolButton>
              <ToolButton active={tool === "eraser"} label="Eraser" onClick={() => onToolChange("eraser")}>
                <Eraser className="h-4 w-4 shrink-0" />
              </ToolButton>
            </>
          ) : (
            <>
              <ToolButton active={tool === "pen"} label="Pen" onClick={() => onToolChange("pen")}>
                <Paintbrush2 className="h-4 w-4 shrink-0" />
              </ToolButton>
              <ToolButton active={tool === "highlighter"} label="Highlighter" onClick={() => onToolChange("highlighter")}>
                <Highlighter className="h-4 w-4 shrink-0" />
              </ToolButton>
              <ToolButton active={tool === "eraser"} label="Eraser" onClick={() => onToolChange("eraser")}>
                <Eraser className="h-4 w-4 shrink-0" />
              </ToolButton>
            </>
          )}
        </div>

        <span className="h-5 w-px shrink-0 bg-[rgba(120,90,80,0.12)]" aria-hidden />

        <div className={cn(ROW, "gap-1")} aria-label="Colors">
          {pastelColors.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                "size-[17px] shrink-0 rounded-full border border-[rgba(120,90,80,0.15)] shadow-sm transition-editorial",
                c === color ? "ring-2 ring-copper/40 ring-offset-1 ring-offset-surface-panel" : "hover:scale-[1.05]",
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
            className="size-[17px] shrink-0 cursor-pointer rounded-full border border-[rgba(120,90,80,0.15)] bg-transparent p-0"
            aria-label="Pick custom color"
          />
        </div>

        <span className="h-5 w-px shrink-0 bg-[rgba(120,90,80,0.12)]" aria-hidden />

        <div className={cn(ROW, "gap-1")} aria-label="Stroke size">
          <span className="hidden shrink-0 text-[10px] font-medium uppercase tracking-wide text-ink-muted sm:inline">
            Size
          </span>
          <input
            type="range"
            min={2}
            max={26}
            step={1}
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="h-3 w-[88px] shrink-0 cursor-pointer accent-copper sm:w-[100px]"
            aria-label="Stroke size"
          />
          <span className="w-7 shrink-0 text-right text-[10px] font-medium tabular-nums text-ink-secondary">{size}</span>
        </div>

        <span className="h-5 w-px shrink-0 bg-[rgba(120,90,80,0.12)]" aria-hidden />

        {showPaper ? (
          <>
            <div
              className={cn(ROW, "rounded-md border border-[rgba(120,90,80,0.12)] bg-surface-page/90 p-0.5")}
              role="group"
              aria-label="Paper style"
            >
              <button
                type="button"
                onClick={() => setPaper({ style: "blank" })}
                className={cn(
                  "inline-flex h-8 min-w-[2rem] items-center justify-center rounded px-2 text-xs font-medium transition",
                  style === "blank" ? "bg-surface-panel text-ink shadow-sm" : "text-ink-secondary hover:text-ink",
                )}
                aria-pressed={style === "blank"}
              >
                Blank
              </button>
              <button
                type="button"
                onClick={() => setPaper({ style: "lined" })}
                className={cn(
                  "inline-flex h-8 min-w-[2rem] items-center justify-center rounded px-2 text-xs font-medium transition",
                  style === "lined" ? "bg-surface-panel text-ink shadow-sm" : "text-ink-secondary hover:text-ink",
                )}
                aria-pressed={style === "lined"}
              >
                Lined
              </button>
            </div>

            <div className={cn(ROW, "gap-1")} aria-label="Paper opacity">
              <span className="hidden text-[10px] font-medium uppercase tracking-wide text-ink-muted md:inline">
                Paper
              </span>
              <input
                type="range"
                min={0}
                max={0.3}
                step={0.01}
                value={opacity}
                onChange={(e) => setPaper({ opacity: Number(e.target.value) })}
                className="h-3 w-[72px] shrink-0 cursor-pointer accent-copper md:w-[88px]"
                aria-label="Paper opacity"
              />
              <span className="w-7 shrink-0 text-right text-[10px] font-medium tabular-nums text-ink-secondary">
                {(opacity * 100).toFixed(0)}%
              </span>
            </div>

            <span className="h-5 w-px shrink-0 bg-[rgba(120,90,80,0.12)]" aria-hidden />
          </>
        ) : null}

        <div className={cn(ROW, "gap-0.5")} aria-label="History">
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

        {showExportSave ? (
          <div className={cn(ROW, "gap-0.5")} aria-label="Export and save">
            <ToolButton label="Export PNG" onClick={onExportPng}>
              <Download className="h-4 w-4 shrink-0" />
            </ToolButton>
            <ToolButton label="Save" onClick={onSave}>
              <Save className="h-4 w-4 shrink-0" />
            </ToolButton>
          </div>
        ) : null}
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
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium leading-none transition-editorial",
        "border border-transparent",
        "disabled:pointer-events-none disabled:opacity-40",
        active
          ? "border-copper/30 bg-rose-light/60 text-ink shadow-sm"
          : "text-ink-secondary hover:bg-black/[0.04] hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
