"use client";

import * as React from "react";
import { CheckCircle2, ExternalLink, RotateCcw, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudyHighlightRead, StudyQuizQuestionRead } from "@/lib/studyApi";

type AnswerState =
  | { status: "idle" }
  | { status: "correct" }
  | { status: "incorrect" }
  | { status: "revealed" }; // short answer

export function QuizTab({
  questions,
  highlightsById,
  onOpenSource,
  emptyHint,
}: {
  questions: StudyQuizQuestionRead[];
  highlightsById: Map<string, StudyHighlightRead>;
  onOpenSource: (page: number, highlightId: string | null) => void;
  emptyHint: string;
}) {
  const [idx, setIdx] = React.useState(0);
  const [choice, setChoice] = React.useState<string | null>(null);
  const [shortDraft, setShortDraft] = React.useState("");
  const [state, setState] = React.useState<AnswerState>({ status: "idle" });
  const [incorrectIds, setIncorrectIds] = React.useState<Set<string>>(() => new Set());
  const [showExplanation, setShowExplanation] = React.useState(false);

  React.useEffect(() => {
    setIdx(0);
    setChoice(null);
    setShortDraft("");
    setState({ status: "idle" });
    setShowExplanation(false);
  }, [questions]);

  const q = questions[idx];
  const hl = q?.highlight_id ? highlightsById.get(q.highlight_id) : undefined;

  const onSubmit = () => {
    if (!q) return;
    setShowExplanation(true);
    if (q.question_type === "short_answer") {
      const ok =
        shortDraft.trim().toLowerCase().replace(/\s+/g, " ") ===
        q.correct_answer.trim().toLowerCase().replace(/\s+/g, " ");
      setState(ok ? { status: "correct" } : { status: "revealed" });
      if (!ok) setIncorrectIds((s) => new Set(s).add(q.id));
      return;
    }
    const sel = choice?.trim();
    if (!sel) return;
    const ok = sel === q.correct_answer.trim();
    setState(ok ? { status: "correct" } : { status: "incorrect" });
    if (!ok) setIncorrectIds((s) => new Set(s).add(q.id));
  };

  const retryIncorrect = () => {
    const next = questions.find((qq) => incorrectIds.has(qq.id));
    if (next) {
      const i = questions.indexOf(next);
      setIdx(i);
      setChoice(null);
      setShortDraft("");
      setState({ status: "idle" });
      setShowExplanation(false);
    }
  };

  if (!questions.length) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[rgba(120,90,80,0.08)] bg-white px-6 py-16 text-center shadow-[0_12px_40px_rgba(40,30,20,0.06)]">
        <p className="max-w-sm text-sm leading-relaxed text-ink-secondary">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(120,90,80,0.08)] bg-white px-4 py-3 shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          Question {idx + 1} / {questions.length}
        </span>
        {incorrectIds.size > 0 ? (
          <span className="text-xs font-medium text-rose-deep">Missed: {incorrectIds.size}</span>
        ) : (
          <span className="text-xs text-ink-muted">Active recall</span>
        )}
        {incorrectIds.size > 0 ? (
          <Button type="button" variant="ghost" size="sm" className="gap-1 text-rose-deep" onClick={retryIncorrect}>
            <RotateCcw className="h-3.5 w-3.5" />
            Retry missed
          </Button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[rgba(120,90,80,0.1)] bg-white p-6 shadow-[0_16px_48px_rgba(40,30,20,0.07)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span className="rounded-full bg-copper/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-copper">
            {q.question_type.replace("_", " ")}
          </span>
          {hl ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-deep underline decoration-rose-deep/35 underline-offset-2"
              onClick={() => onOpenSource(hl.page, q.highlight_id)}
            >
              <ExternalLink className="h-3 w-3" />
              Source
            </button>
          ) : null}
        </div>
        <p className="mt-4 text-base font-medium leading-relaxed text-ink">{q.question}</p>

        {q.question_type === "short_answer" ? (
          <textarea
            value={shortDraft}
            onChange={(e) => setShortDraft(e.target.value)}
            disabled={state.status !== "idle"}
            placeholder="Type your answer…"
            className={cn(
              "mt-4 min-h-[88px] w-full resize-y rounded-xl border border-[rgba(120,90,80,0.12)] bg-[#fffefb] px-3 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/20",
            )}
          />
        ) : (
          <ul className="mt-4 space-y-2">
            {q.options.map((opt) => {
              const picked = choice === opt;
              return (
                <li key={opt}>
                  <button
                    type="button"
                    disabled={state.status !== "idle"}
                    onClick={() => setChoice(opt)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                      picked
                        ? "border-copper/35 bg-copper/[0.06] text-ink"
                        : "border-[rgba(120,90,80,0.1)] bg-white hover:bg-rose-light/25",
                      state.status !== "idle" && opt === q.correct_answer && "border-emerald-400/50 bg-emerald-50/80",
                      state.status !== "idle" && picked && opt !== q.correct_answer && "border-red-300/60 bg-red-50/80",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        picked ? "border-copper bg-copper text-white" : "border-[rgba(120,90,80,0.2)]",
                      )}
                    >
                      {picked ? "✓" : ""}
                    </span>
                    {opt}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button type="button" variant="primary" size="sm" disabled={state.status !== "idle"} onClick={onSubmit}>
            Check answer
          </Button>
          {state.status === "correct" ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Correct
            </span>
          ) : null}
          {state.status === "incorrect" ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-red-700">
              <XCircle className="h-4 w-4" /> Incorrect
            </span>
          ) : null}
        </div>

        {showExplanation && q.explanation ? (
          <div className="mt-5 rounded-xl border border-[rgba(120,90,80,0.08)] bg-surface-page/80 px-4 py-3 text-sm leading-relaxed text-ink-secondary">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Explanation</span>
            <p className="mt-1">{q.explanation}</p>
            {(state.status === "incorrect" || state.status === "revealed") && (
              <p className="mt-2 text-xs text-ink">
                <span className="font-medium text-ink-muted">Expected: </span>
                {q.correct_answer}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={idx <= 0}
          onClick={() => {
            setIdx((i) => i - 1);
            setChoice(null);
            setShortDraft("");
            setState({ status: "idle" });
            setShowExplanation(false);
          }}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={idx >= questions.length - 1}
          onClick={() => {
            setIdx((i) => i + 1);
            setChoice(null);
            setShortDraft("");
            setState({ status: "idle" });
            setShowExplanation(false);
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
