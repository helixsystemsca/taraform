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

import type { AnnotationTool } from "@/lib/annotations";
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
export type NotesToolbarMode = "draw" | "annotate";

const ROW = "flex h-9 min-h-9 shrink-0 items-center";

const TOOL_ORDER: AnnotationTool[] = ["select", "pen", "highlighter", "sticky", "eraser"];

function toolDisabled(mode: NotesToolbarMode, t: AnnotationTool): boolean {
  if (mode === "draw") {
    return t === "select" || t === "sticky";
  }
  return t === "pen";
}

function toolHoverLabel(tool: AnnotationTool, mode: NotesToolbarMode): string {
  switch (tool) {
    case "select":
      return mode === "draw"
        ? "Select — open a study PDF to select highlights, ink, and stickies"
        : "Select — tap ink, a highlight, or a sticky; drag to move; Delete to remove";
    case "pen":
      return "Pen — freehand ink strokes";
    case "highlighter":
      return mode === "draw"
        ? "Highlighter — soft, translucent strokes"
        : "Highlighter — drag across text to highlight and sync an excerpt";
    case "sticky":
      return mode === "draw"
        ? "Sticky note — available when annotating a study PDF"
        : "Sticky note — tap the page to place; drag the card to move";
    case "eraser":
      return mode === "draw"
        ? "Eraser — remove ink strokes"
        : "Eraser — drag across ink to erase, or tap a highlight to clear it";
    default:
      return tool;
  }
}

function ToolbarTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[80] -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1",
          "bg-ink text-[11px] font-medium leading-tight text-surface-panel shadow-lg",
          "opacity-0 shadow-black/25 transition-opacity duration-150 ease-out",
          "group-hover/tt:opacity-100 group-hover/tt:delay-100 group-focus-within/tt:opacity-100",
        )}
      >
        {text}
      </span>
    </span>
  );
}

export function NotesToolbar({
  mode,
  tool,
  onToolChange,
  color,
  onColorChange,
  size,
  onSizeChange,
  paperStyle,
  paperOpacity,
  paperLineOpacity,
  onPaperStyleChange,
  onPaperOpacityChange,
  onPaperLineOpacityChange,
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
  mode: NotesToolbarMode;
  tool: AnnotationTool;
  onToolChange: (t: AnnotationTool) => void;
  color: string;
  onColorChange: (c: string) => void;
  size: number;
  onSizeChange: (n: number) => void;
  paperStyle?: PaperStyle;
  paperOpacity?: number;
  /** 0–1 strength of ruled line visibility (lined mode). */
  paperLineOpacity?: number;
  onPaperStyleChange?: (s: PaperStyle) => void;
  onPaperOpacityChange?: (n: number) => void;
  onPaperLineOpacityChange?: (n: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onExportPng: () => void;
  showPaper?: boolean;
  showExportSave?: boolean;
}) {
  const style = paperStyle ?? "blank";
  const opacity = paperOpacity ?? 0.18;
  const lineOpacity = paperLineOpacity ?? 1;

  function setPaper(next: { style?: PaperStyle; opacity?: number; lineOpacity?: number }) {
    const nextStyle = next.style ?? style;
    const nextOpacity = next.opacity ?? opacity;
    const nextLineOpacity = next.lineOpacity ?? lineOpacity;
    onPaperStyleChange?.(nextStyle);
    onPaperOpacityChange?.(nextOpacity);
    onPaperLineOpacityChange?.(nextLineOpacity);
    window.dispatchEvent(
      new CustomEvent("taraform:paper", {
        detail: { style: nextStyle, opacity: nextOpacity, lineOpacity: nextLineOpacity },
      }),
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
        <ToolbarTooltip text="Home">
          <Link
            href="/"
            className={cn(
              ROW,
              "w-9 justify-center rounded-lg border border-transparent text-ink-secondary transition-[color,background-color,border-color] duration-150 ease-out",
              "hover:border-[rgba(120,90,80,0.12)] hover:bg-black/[0.04] hover:text-ink",
            )}
            aria-label="Home"
          >
            <Home className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          </Link>
        </ToolbarTooltip>

        <span className="h-5 w-px shrink-0 bg-[rgba(120,90,80,0.12)]" aria-hidden />

        <div className={cn(ROW, "gap-0.5")} aria-label="Annotation tools">
          {TOOL_ORDER.map((t) => {
            const disabled = toolDisabled(mode, t);
            const active = tool === t;
            if (t === "select") {
              return (
                <ToolButton
                  key={t}
                  active={active}
                  disabled={disabled}
                  label="Select"
                  tooltip={toolHoverLabel("select", mode)}
                  onClick={() => onToolChange("select")}
                >
                  <MousePointer2 className="h-4 w-4 shrink-0" />
                </ToolButton>
              );
            }
            if (t === "pen") {
              return (
                <ToolButton
                  key={t}
                  active={active}
                  disabled={disabled}
                  label="Pen"
                  tooltip={toolHoverLabel("pen", mode)}
                  onClick={() => onToolChange("pen")}
                >
                  <Paintbrush2 className="h-4 w-4 shrink-0" />
                </ToolButton>
              );
            }
            if (t === "highlighter") {
              return (
                <ToolButton
                  key={t}
                  active={active}
                  disabled={disabled}
                  label="Highlighter"
                  tooltip={toolHoverLabel("highlighter", mode)}
                  onClick={() => onToolChange("highlighter")}
                >
                  <Highlighter className="h-4 w-4 shrink-0" />
                </ToolButton>
              );
            }
            if (t === "sticky") {
              return (
                <ToolButton
                  key={t}
                  active={active}
                  disabled={disabled}
                  label="Sticky note"
                  tooltip={toolHoverLabel("sticky", mode)}
                  onClick={() => onToolChange("sticky")}
                >
                  <StickyNote className="h-4 w-4 shrink-0" />
                </ToolButton>
              );
            }
            return (
              <ToolButton
                key={t}
                active={active}
                disabled={disabled}
                label="Eraser"
                tooltip={toolHoverLabel("eraser", mode)}
                onClick={() => onToolChange("eraser")}
              >
                <Eraser className="h-4 w-4 shrink-0" />
              </ToolButton>
            );
          })}
        </div>

        <span className="h-5 w-px shrink-0 bg-[rgba(120,90,80,0.12)]" aria-hidden />

        <div className={cn(ROW, "gap-1")} aria-label="Colors">
          {pastelColors.map((c) => (
            <ToolbarTooltip key={c} text={`Ink color ${c}`}>
              <button
                type="button"
                className={cn(
                  "size-[17px] shrink-0 rounded-full border border-[rgba(120,90,80,0.15)] shadow-sm transition-[transform,box-shadow] duration-150 ease-out",
                  c === color ? "ring-2 ring-copper/40 ring-offset-1 ring-offset-surface-panel" : "hover:scale-[1.05]",
                )}
                style={{ background: c }}
                aria-label={`Set color ${c}`}
                onClick={() => onColorChange(c)}
              />
            </ToolbarTooltip>
          ))}
          <ToolbarTooltip text="Custom ink color">
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="size-[17px] shrink-0 cursor-pointer rounded-full border border-[rgba(120,90,80,0.15)] bg-transparent p-0"
              aria-label="Pick custom color"
            />
          </ToolbarTooltip>
        </div>

        <span className="h-5 w-px shrink-0 bg-[rgba(120,90,80,0.12)]" aria-hidden />

        <ToolbarTooltip text="Stroke width for pen, highlighter, and eraser">
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
        </ToolbarTooltip>

        <span className="h-5 w-px shrink-0 bg-[rgba(120,90,80,0.12)]" aria-hidden />

        {showPaper ? (
          <>
            <div
              className={cn(ROW, "rounded-md border border-[rgba(120,90,80,0.12)] bg-surface-page/90 p-0.5")}
              role="group"
              aria-label="Paper style"
            >
              <ToolbarTooltip text="Plain canvas — no ruled lines">
                <button
                  type="button"
                  onClick={() => setPaper({ style: "blank" })}
                  className={cn(
                    "inline-flex h-8 min-w-[2rem] items-center justify-center rounded px-2 text-xs font-medium transition-colors duration-150",
                    style === "blank" ? "bg-surface-panel text-ink shadow-sm" : "text-ink-secondary hover:text-ink",
                  )}
                  aria-pressed={style === "blank"}
                >
                  Blank
                </button>
              </ToolbarTooltip>
              <ToolbarTooltip text="Notebook-style horizontal rules">
                <button
                  type="button"
                  onClick={() => setPaper({ style: "lined" })}
                  className={cn(
                    "inline-flex h-8 min-w-[2rem] items-center justify-center rounded px-2 text-xs font-medium transition-colors duration-150",
                    style === "lined" ? "bg-surface-panel text-ink shadow-sm" : "text-ink-secondary hover:text-ink",
                  )}
                  aria-pressed={style === "lined"}
                >
                  Lined
                </button>
              </ToolbarTooltip>
            </div>

            <ToolbarTooltip text="Overall strength of the ruled paper layer (lined mode)">
              <div className={cn(ROW, "gap-1")} aria-label="Paper layer opacity">
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
                  aria-label="Paper layer opacity"
                />
                <span className="w-7 shrink-0 text-right text-[10px] font-medium tabular-nums text-ink-secondary">
                  {(opacity * 100).toFixed(0)}%
                </span>
              </div>
            </ToolbarTooltip>

            {style === "lined" ? (
              <ToolbarTooltip text="How dark the horizontal lines appear (ruled paper)">
                <div className={cn(ROW, "gap-1")} aria-label="Line opacity">
                  <span className="hidden text-[10px] font-medium uppercase tracking-wide text-ink-muted lg:inline">
                    Lines
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={lineOpacity}
                    onChange={(e) => setPaper({ lineOpacity: Number(e.target.value) })}
                    className="h-3 w-[72px] shrink-0 cursor-pointer accent-copper lg:w-[88px]"
                    aria-label="Ruled line opacity"
                  />
                  <span className="w-7 shrink-0 text-right text-[10px] font-medium tabular-nums text-ink-secondary">
                    {(lineOpacity * 100).toFixed(0)}%
                  </span>
                </div>
              </ToolbarTooltip>
            ) : null}

            <span className="h-5 w-px shrink-0 bg-[rgba(120,90,80,0.12)]" aria-hidden />
          </>
        ) : null}

        <div className={cn(ROW, "gap-0.5")} aria-label="History">
          <ToolButton label="Undo" tooltip="Undo last change" disabled={!canUndo} onClick={onUndo}>
            <Undo2 className="h-4 w-4 shrink-0" />
          </ToolButton>
          <ToolButton label="Redo" tooltip="Redo" disabled={!canRedo} onClick={onRedo}>
            <Redo2 className="h-4 w-4 shrink-0" />
          </ToolButton>
          <ToolButton label="Clear" tooltip="Erase all strokes on this note" onClick={onClear}>
            <Trash2 className="h-4 w-4 shrink-0" />
          </ToolButton>
        </div>

        {showExportSave ? (
          <div className={cn(ROW, "gap-0.5")} aria-label="Export and save">
            <ToolButton label="Export PNG" tooltip="Download canvas as PNG" onClick={onExportPng}>
              <Download className="h-4 w-4 shrink-0" />
            </ToolButton>
            <ToolButton label="Save" tooltip="Save note to this device" onClick={onSave}>
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
  tooltip,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  tooltip?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const tip = tooltip ?? label;
  const button = (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? tip : undefined}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium leading-none",
        "border border-transparent transition-[color,background-color,border-color,box-shadow] duration-150 ease-out",
        "disabled:pointer-events-none disabled:opacity-40",
        active
          ? "border-copper/30 bg-rose-light/60 text-ink shadow-sm"
          : "text-ink-secondary hover:bg-black/[0.04] hover:text-ink",
      )}
    >
      {children}
    </button>
  );
  if (disabled) return button;
  return <ToolbarTooltip text={tip}>{button}</ToolbarTooltip>;
}
