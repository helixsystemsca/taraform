"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";

import { generateQuizForSection } from "@/app/actions/generateQuizForSection";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { withQuestionIds } from "@/lib/quizWithIds";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/useStudyStore";

export default function PlanPage() {
  const router = useRouter();
  const sections = useStudyStore((s) => s.sections);
  const studyPlan = useStudyStore((s) => s.studyPlan);
  const regenerate = useStudyStore((s) => s.regenerateStudyPlan);
  const completeItem = useStudyStore((s) => s.completeStudyPlanItem);
  const reset = useStudyStore((s) => s.resetStudyPlanSession);
  const selectSection = useStudyStore((s) => s.selectSection);
  const quizzes = useStudyStore((s) => s.quizzes);
  const setQuizForSection = useStudyStore((s) => s.setQuizForSection);

  const items = studyPlan.items ?? [];
  const completed = studyPlan.completed ?? {};

  React.useEffect(() => {
    if (sections.length === 0) return;
    if (items.length > 0) return;
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length]);

  const nextItem = items.find((i) => !completed[i.sectionId]) ?? null;
  const current = nextItem
    ? sections.find((s) => s.id === nextItem.sectionId) ?? null
    : null;

  const [busyQuiz, setBusyQuiz] = React.useState(false);

  async function takeQuiz() {
    if (!current) return;
    const existing = quizzes[current.id];
    if (existing?.length) {
      selectSection(current.id);
      router.push("/study");
      return;
    }
    setBusyQuiz(true);
    try {
      const result = await generateQuizForSection({
        sectionTitle: current.title,
        extractedText: current.extractedText,
        keyConcepts: current.keyConcepts ?? [],
      });
      setQuizForSection(current.id, withQuestionIds(result.questions));
      selectSection(current.id);
      router.push("/study");
    } finally {
      setBusyQuiz(false);
    }
  }

  return (
    <div className="space-y-5">
      <GlassCard className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="font-display text-lg font-semibold text-ink">Study plan</div>
            <p className="mt-1 text-sm text-ink/55">A simple next-session checklist based on your analytics.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => regenerate()} disabled={sections.length === 0}>
              <RefreshCw className="h-4 w-4 text-copper" />
              Regenerate
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => reset()} disabled={items.length === 0}>
              Reset
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/home">Home</Link>
            </Button>
          </div>
        </div>
      </GlassCard>

      {items.length === 0 ? (
        <GlassCard className="p-6">
          <div className="text-sm text-ink/60">No plan yet. Add sections and take quizzes, then regenerate.</div>
        </GlassCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <GlassCard className="p-5">
            <div className="text-sm font-semibold text-ink">Next session list</div>
            <div className="mt-3 space-y-2">
              {items.map((it, idx) => {
                const done = !!completed[it.sectionId];
                const active = nextItem?.sectionId === it.sectionId;
                return (
                  <button
                    key={it.sectionId}
                    type="button"
                    className={cn(
                      "w-full rounded-2xl border px-4 py-3 text-left text-sm transition",
                      done
                        ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                        : active
                          ? "border-blush-dust/55 bg-white/80 text-ink shadow-sm shadow-stone-900/5"
                          : "border-stone-200/70 bg-white/55 text-ink/75 hover:bg-white/70",
                    )}
                    onClick={() => {
                      selectSection(it.sectionId);
                      router.push("/study");
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 truncate font-medium">
                        {idx + 1}. {it.title}
                      </div>
                      {done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : null}
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink/45">{it.reason}</div>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <div className="text-sm font-semibold text-ink">Current focus</div>
            {!current || !nextItem ? (
              <div className="mt-3 text-sm text-ink/60">
                Session complete. Regenerate a new plan when you’re ready.
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                <div>
                  <div className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">{current.title}</div>
                  <div className="mt-1 text-xs text-ink/45">{nextItem.reason}</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      selectSection(current.id);
                      router.push("/study");
                    }}
                  >
                    Start studying
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="default" onClick={() => void takeQuiz()} disabled={busyQuiz}>
                    <Sparkles className="h-4 w-4 text-copper" />
                    {busyQuiz ? "Generating…" : "Take quiz"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      completeItem(current.id);
                      if (items.every((x) => completed[x.sectionId] || x.sectionId === current.id)) {
                        regenerate();
                      }
                    }}
                  >
                    Mark complete
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}

