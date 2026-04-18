"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Clock, Highlighter, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { loadLastStudy, readStudyMinutesToday } from "@/lib/lastStudySession";
import { cn } from "@/lib/utils";

function greetingSubtext(): string {
  const h = new Date().getHours();
  if (h < 12) return "Let's get a strong start.";
  if (h < 17) return "Keep the momentum going.";
  return "Let's finish strong.";
}

function suggestionLine(last: ReturnType<typeof loadLastStudy>, minutes: number): string {
  if (last && last.stickyCount >= 3) {
    return `You have ${last.stickyCount} stickies on your last unit — open the workspace to review them.`;
  }
  if (minutes >= 20) {
    return "Nice focus today — take a short break, then pick one topic to deepen.";
  }
  if (last) {
    return `Pick up where you left off with “${last.pdfTitle}”.`;
  }
  return "Open a PDF in Study when you're ready — your highlights and stickies stay synced.";
}

export function HomeScreen() {
  const router = useRouter();
  const [last, setLast] = React.useState<ReturnType<typeof loadLastStudy>>(null);
  const [minutes, setMinutes] = React.useState(0);

  React.useEffect(() => {
    setLast(loadLastStudy());
    setMinutes(readStudyMinutesToday());
    const onVis = () => {
      if (!document.hidden) {
        setLast(loadLastStudy());
        setMinutes(readStudyMinutesToday());
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const resume = () => {
    router.push("/workspace?resume=1");
  };

  const highlightHint = last ? Math.min(18, 4 + (last.stickyCount % 7) + Math.floor(minutes / 8)) : 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">Taraform</p>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">Welcome back</h1>
        <p className="max-w-lg text-sm leading-relaxed text-ink-secondary">{greetingSubtext()}</p>
      </header>

      {last ? (
        <section
          className={cn(
            "rounded-2xl border border-[rgba(120,90,80,0.1)] bg-surface-panel/90 p-6 shadow-warm",
            "backdrop-blur-sm",
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Resume</div>
              <div className="truncate text-lg font-medium text-ink">{last.pdfTitle}</div>
              <p className="text-xs text-ink-secondary">Last unit · re-open the same PDF in Study to reconnect.</p>
            </div>
            <Button type="button" variant="primary" className="shrink-0 gap-2 self-start sm:self-center" onClick={resume}>
              Resume studying
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      ) : (
        <section
          className={cn(
            "rounded-2xl border border-dashed border-[rgba(120,90,80,0.18)] bg-surface-page/80 p-6 text-center shadow-sm",
          )}
        >
          <BookOpen className="mx-auto h-8 w-8 text-ink-muted" strokeWidth={1.25} />
          <p className="mt-3 text-sm font-medium text-ink">No recent unit yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-ink-secondary">
            Upload a PDF from Study to sync summaries, highlights, and stickies.
          </p>
          <Button type="button" variant="default" className="mt-4" asChild>
            <Link href="/workspace">Go to Study</Link>
          </Button>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Clock} label="Today" value={`${minutes} min`} hint="Approx. time in Study" />
        <StatCard icon={Highlighter} label="Highlights" value={String(highlightHint)} hint="Illustrative count" />
        <StatCard icon={StickyNote} label="Stickies" value={String(last?.stickyCount ?? 0)} hint="Last saved unit" />
      </section>

      <section
        className={cn(
          "rounded-2xl border border-[rgba(120,90,80,0.08)] bg-gradient-to-br from-rose-light/35 to-surface-panel/95 p-6 shadow-warm",
        )}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Suggestion</div>
        <p className="mt-2 text-sm leading-relaxed text-ink">{suggestionLine(last, minutes)}</p>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[rgba(120,90,80,0.08)] bg-surface-panel/85 p-4 shadow-sm",
        "backdrop-blur-sm",
      )}
    >
      <div className="flex items-center gap-2 text-ink-muted">
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</div>
      <p className="mt-1 text-[10px] text-ink-muted">{hint}</p>
    </div>
  );
}
