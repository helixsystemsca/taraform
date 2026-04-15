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
        <div className="text-lg font-semibold text-white">Quiz complete</div>
        <p className="mt-2 text-sm text-white/65">
          Nice work, Tara. Your confidence and timing were saved for analytics.
        </p>
        <div className="mt-4 text-xs text-white/45">Session time ≈ {totalElapsedSec}s</div>
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
          <div className="flex items-center gap-2 text-xs text-white/55">
            <Clock className="h-4 w-4" />
            {totalElapsedSec}s
          </div>
        </div>
        <CardDescription className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-white/50" />
          {q.type === "select_all"
            ? "Select all that apply"
            : q.type === "case_study"
              ? "Case study"
              : "Multiple choice"}
        </CardDescription>
      </CardHeader>

      <div className="space-y-4">
        {q.type === "case_study" ? (
          <div className="rounded-2xl bg-black/22 p-4 text-sm leading-relaxed text-white/82 ring-1 ring-white/10">
            {q.vignette}
          </div>
        ) : null}

        <div className="text-[15px] leading-relaxed text-white">{q.prompt}</div>

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
                  "w-full rounded-2xl px-4 py-3 text-left text-sm text-white/88 ring-1 ring-white/12 transition",
                  "bg-white/6 hover:bg-white/9",
                  selected && step === "answer" && "bg-white/11 ring-white/18",
                  showKey && isCorrectChoice && "bg-emerald-400/12 ring-emerald-300/22",
                  showKey && selected && !isCorrectChoice && "bg-red-400/10 ring-red-300/22",
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
                "rounded-2xl p-4 text-sm ring-1",
                lastCorrect
                  ? "bg-emerald-400/10 text-emerald-50 ring-emerald-300/20"
                  : "bg-amber-400/8 text-amber-50 ring-amber-300/18",
              )}
            >
              <div className="font-medium">{lastCorrect ? "Correct" : "Let’s tighten this up"}</div>
              <p className="mt-2 text-white/80">{q.rationale}</p>
            </div>

            <div className="space-y-2 rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">How confident do you feel?</span>
                <span className="tabular-nums text-white/55">{confidence}%</span>
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
