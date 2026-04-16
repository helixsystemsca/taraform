"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ListChecks, RefreshCw } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/useStudyStore";

export function StudyPlanPanel() {
  const sections = useStudyStore((s) => s.sections);
  const studyPlan = useStudyStore((s) => s.studyPlan);
  const regenerate = useStudyStore((s) => s.regenerateStudyPlan);
  const reset = useStudyStore((s) => s.resetStudyPlanSession);

  const items = studyPlan.items ?? [];
  const completed = studyPlan.completed ?? {};
  const completedCount = items.filter((i) => completed[i.sectionId]).length;

  React.useEffect(() => {
    if (sections.length === 0) return;
    if (items.length > 0) return;
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length]);

  return (
    <GlassCard className="p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-copper/20 bg-blush-medium/70 px-3 py-1 text-xs font-medium text-ink/80">
            <ListChecks className="h-3.5 w-3.5 text-copper" />
            Next Study Session
          </div>
          <div className="mt-3 font-display text-xl font-semibold tracking-[-0.03em] text-ink">
            Your plan for today
          </div>
          <p className="mt-1 text-sm text-ink/55">Weak sections first, then spaced review.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => regenerate()}
            disabled={sections.length === 0}
          >
            <RefreshCw className="h-4 w-4 text-copper" />
            Regenerate
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => reset()} disabled={items.length === 0}>
            Reset
          </Button>
          <Button asChild variant="primary" size="sm" disabled={items.length === 0}>
            <Link href="/plan">Start studying</Link>
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-stone-200/70 bg-white/55 px-4 py-4 text-sm text-ink/60">
          Add sections and take a quiz to generate a plan.
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {items.map((it, idx) => {
            const done = !!completed[it.sectionId];
            return (
              <div
                key={it.sectionId}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm",
                  done
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                    : "border-stone-200/70 bg-white/60 text-ink/75",
                )}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink/85">
                    {idx + 1}. {it.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink/45">{it.reason}</div>
                </div>
                {done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : null}
              </div>
            );
          })}
          <div className="pt-2 text-xs text-ink/45">
            {completedCount}/{items.length} completed
          </div>
        </div>
      )}
    </GlassCard>
  );
}

