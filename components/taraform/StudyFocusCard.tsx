"use client";

import * as React from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

function formatMmSs(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Quiet floating focus timer — editorial “deep work” card. */
export function StudyFocusCard({ className }: { className?: string }) {
  const initial = 25 * 60;
  const [remaining, setRemaining] = React.useState(initial);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (!running || remaining <= 0) return;
    const id = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running, remaining]);

  return (
    <div
      className={cn(
        "pointer-events-auto w-[200px] rounded-xl border border-[rgba(120,90,80,0.1)]",
        "bg-[rgba(251,248,244,0.78)] p-4 shadow-warm backdrop-blur-md transition-editorial",
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">Deep work focus</p>
      <p className="mt-2 font-display text-3xl font-medium tabular-nums tracking-tight text-ink">{formatMmSs(remaining)}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((v) => !v)}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[rgba(120,90,80,0.1)] bg-surface-panel/90 text-xs font-medium text-ink-secondary transition-editorial hover:border-copper/25 hover:text-ink"
          aria-label={running ? "Pause" : "Start"}
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {running ? "Pause" : "Start"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setRemaining(initial);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(120,90,80,0.1)] text-ink-secondary transition-editorial hover:border-copper/25 hover:text-ink"
          aria-label="Reset timer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
