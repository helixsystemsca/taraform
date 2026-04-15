"use client";

import * as React from "react";
import { ArrowRight, Check, Clock, HelpCircle } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { QuizQuestionWithId } from "@/stores/useStudyStore";
import { useStudyStore } from "@/stores/useStudyStore";

type Step = "answer" | "reflect";

function isAnswerCorrect(
  q: QuizQuestionWithId,
  pickedIndex: number | null,
  pickedSet: Set<number>,
): boolean {
  if (q.type === "multiple_choice" || q.type === "case_study") {
    return pickedIndex === q.correctIndex;
  }
  const a = Array.from(pickedSet).sort((x, y) => x - y);
  const b = Array.from(new Set(q.correctIndices)).sort((x, y) => x - y);
  return a.length === b.length && a.every((v, i) => v === b[i]!);
}

export function QuizRunner(props: { sectionId: string; questions: QuizQuestionWithId[] }) {
  const addQuizResult = useStudyStore((s) => s.addQuizResult);
  const updateTimeSpent = useStudyStore((s) => s.updateTimeSpent);

  const [sessionStart] = React.useState(() => Date.now());
  const questionStartedAt = React.useRef(Date.now());
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [step, setStep] = React.useState<Step>("answer");
  const [pickedIndex, setPickedIndex] = React.useState<number | null>(null);
  const [pickedSet, setPickedSet] = React.useState<Set<number>>(() => new Set());
  const [lastCorrect, setLastCorrect] = React.useState(false);
  const [confidence, setConfidence] = React.useState(72);

  const q = props.questions[activeIndex];

  React.useEffect(() => {
    questionStartedAt.current = Date.now();
    setStep("answer");
    setPickedIndex(null);
    setPickedSet(new Set());
    setConfidence(72);
  }, [activeIndex]);

  const totalElapsedSec = Math.max(0, Math.round((Date.now() - sessionStart) / 1000));

  if (!q) return null;

  function submitAnswer() {
    if (q.type === "select_all") {
      if (pickedSet.size === 0) return;
    } else if (pickedIndex == null) return;
    const ok = isAnswerCorrect(q, pickedIndex, pickedSet);
    setLastCorrect(ok);
    setStep("reflect");
  }

  function continueAfterReflection() {
    const dt = Math.max(1, Math.round((Date.now() - questionStartedAt.current) / 1000));
    addQuizResult(props.sectionId, {
      questionId: q.id,
      confidence,
      isCorrect: lastCorrect,
      timeSpent: dt,
    });
    updateTimeSpent(props.sectionId, dt);

    if (activeIndex >= props.questions.length - 1) {
      setActiveIndex(props.questions.length);
      return;
    }
    setActiveIndex((i) => i + 1);
  }

  const finished = activeIndex >= props.questions.length;

  if (finished) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="font-display text-lg font-semibold text-ink">Quiz complete</div>
        <p className="mt-2 text-sm text-ink/65">
          Nice work, Tara. Your confidence and timing were saved for analytics.
        </p>
        <div className="mt-4 text-xs text-ink/45">Session time ≈ {totalElapsedSec}s</div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5 sm:p-6">
      <CardHeader className="space-y-2 p-0 pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">
            Question {activeIndex + 1} / {props.questions.length}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-ink/50">
            <Clock className="h-4 w-4 text-copper" />
            {totalElapsedSec}s
          </div>
        </div>
        <CardDescription className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-copper" />
          {q.type === "select_all"
            ? "Select all that apply"
            : q.type === "case_study"
              ? "Case study"
              : "Multiple choice"}
        </CardDescription>
      </CardHeader>

      <div className="space-y-4">
        {q.type === "case_study" ? (
          <div className="rounded-2xl border border-stone-200/80 bg-blush-medium/50 p-4 text-sm leading-relaxed text-ink/85">
            {q.vignette}
          </div>
        ) : null}

        <div className="text-[15px] leading-relaxed text-ink">{q.prompt}</div>

        <div className="space-y-2">
          {q.choices.map((c, idx) => {
            const selected = q.type === "select_all" ? pickedSet.has(idx) : pickedIndex === idx;
            const isCorrectChoice =
              q.type === "select_all" ? q.correctIndices.includes(idx) : idx === q.correctIndex;
            const showKey = step === "reflect";
            return (
              <button
                key={idx}
                type="button"
                className={cn(
                  "w-full rounded-2xl border border-stone-200/70 bg-white/60 px-4 py-3 text-left text-sm text-ink/90 transition hover:bg-blush-sheet/95",
                  selected && step === "answer" && "border-blush-dust/50 bg-blush-medium/60 ring-1 ring-copper/15",
                  showKey && isCorrectChoice && "border-emerald-300/70 bg-emerald-50/90",
                  showKey && selected && !isCorrectChoice && "border-red-200 bg-red-50/90",
                )}
                disabled={step === "reflect"}
                onClick={() => {
                  if (q.type === "select_all") {
                    setPickedSet((prev) => {
                      const next = new Set(prev);
                      if (next.has(idx)) next.delete(idx);
                      else next.add(idx);
                      return next;
                    });
                  } else {
                    setPickedIndex(idx);
                  }
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {step === "answer" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="primary"
              disabled={
                q.type === "select_all" ? pickedSet.size === 0 : pickedIndex == null
              }
              onClick={submitAnswer}
            >
              <Check className="h-4 w-4" />
              Check answer
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div
              className={cn(
                "rounded-2xl border p-4 text-sm",
                lastCorrect
                  ? "border-emerald-200/80 bg-emerald-50/90 text-ink"
                  : "border-amber-200/80 bg-amber-50/85 text-ink",
              )}
            >
              <div className="font-medium">{lastCorrect ? "Correct" : "Let’s tighten this up"}</div>
              <p className="mt-2 text-ink/75">{q.rationale}</p>
            </div>

            <div className="space-y-2 rounded-2xl border border-stone-200/70 bg-blush-medium/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink/80">How confident do you feel?</span>
                <span className="tabular-nums text-ink/50">{confidence}%</span>
              </div>
              <Slider
                value={[confidence]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => setConfidence(v[0] ?? 0)}
              />
            </div>

            <Button type="button" variant="primary" className="w-full sm:w-auto" onClick={continueAfterReflection}>
              <ArrowRight className="h-4 w-4" />
              Save & continue
            </Button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
