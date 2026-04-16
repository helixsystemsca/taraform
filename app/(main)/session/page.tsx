"use client";

import * as React from "react";
import Link from "next/link";

import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDeviceId } from "@/lib/srs/device";
import type { ConceptRow, SrsQuestion } from "@/lib/srs/types";
import { supabaseBrowser } from "@/lib/supabase";
import { useStudyStore } from "@/stores/useStudyStore";

type Phase = "loading" | "recall" | "mcq" | "feedback" | "done";

export default function SessionPage() {
  const sections = useStudyStore((s) => s.sections);
  const deviceId = React.useMemo(() => getDeviceId(), []);
  const supabase = React.useMemo(() => supabaseBrowser(), []);

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [queue, setQueue] = React.useState<ConceptRow[]>([]);
  const [idx, setIdx] = React.useState(0);

  const current = queue[idx] ?? null;
  const section = React.useMemo(
    () => (current ? sections.find((s) => s.id === current.section_id) ?? null : null),
    [current, sections],
  );

  const [recallText, setRecallText] = React.useState("");
  const [question, setQuestion] = React.useState<SrsQuestion | null>(null);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [correct, setCorrect] = React.useState<boolean | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!deviceId) return;
    if (!supabase) return;
    const nowIso = new Date().toISOString();
    void supabase
      .from("concepts")
      .select("*")
      .eq("device_id", deviceId)
      .lte("next_review", nowIso)
      .order("strength", { ascending: true })
      .limit(25)
      .then(({ data }) => {
        const list = (data as ConceptRow[] | null) ?? [];
        setQueue(list);
        setIdx(0);
        setPhase(list.length ? "recall" : "done");
      });
  }, [deviceId, supabase]);

  if (!supabase) {
    return (
      <GlassCard className="p-6">
        <div className="font-display text-base font-semibold text-ink">Supabase not configured</div>
        <p className="mt-2 text-sm text-ink/60">
          Add <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> and <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>{" "}
          to your environment to enable spaced repetition sessions.
        </p>
      </GlassCard>
    );
  }

  async function loadQuestion() {
    if (!current || !section) return;
    setBusy(true);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: current.concept,
          section_title: section.title ?? "Untitled",
          extracted_text: section.extractedText ?? "",
        }),
      });
      const json = (await res.json()) as { question?: SrsQuestion };
      setQuestion(json.question ?? null);
      setSelected(null);
      setCorrect(null);
      setPhase("mcq");
    } finally {
      setBusy(false);
    }
  }

  async function submitMcq() {
    if (!current || !deviceId || !question || selected == null) return;
    const ok = selected === question.correctIndex;
    setCorrect(ok);
    setBusy(true);
    try {
      await fetch("/api/update-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, concept_id: current.id, correct: ok }),
      });
      setPhase("feedback");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setRecallText("");
    setQuestion(null);
    setSelected(null);
    setCorrect(null);
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    setPhase(nextIdx < queue.length ? "recall" : "done");
  }

  if (phase === "loading") {
    return (
      <GlassCard className="p-6">
        <div className="text-sm font-medium text-ink/70">Loading session…</div>
      </GlassCard>
    );
  }

  if (phase === "done") {
    return (
      <GlassCard className="p-6">
        <div className="font-display text-lg font-semibold text-ink">Session complete</div>
        <p className="mt-2 text-sm text-ink/55">No more due concepts right now.</p>
        <div className="mt-4 flex gap-2">
          <Button asChild variant="primary">
            <Link href="/review">Back to review</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/concepts">Concepts</Link>
          </Button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">
              Due concept {idx + 1} / {queue.length}
            </div>
            <div className="mt-2 font-display text-xl font-semibold tracking-[-0.02em] text-ink">{current?.concept}</div>
            <div className="mt-1 text-sm text-ink/55">{section?.title ?? "Section"}</div>
          </div>
          <Button asChild variant="ghost" className="shrink-0">
            <Link href="/review">Exit</Link>
          </Button>
        </div>
      </GlassCard>

      {phase === "recall" ? (
        <GlassCard className="p-5 sm:p-6">
          <div className="text-sm font-semibold text-ink">Active recall</div>
          <p className="mt-1 text-sm text-ink/55">Write what you remember before seeing options.</p>
          <textarea
            value={recallText}
            onChange={(e) => setRecallText(e.target.value)}
            rows={6}
            className={cn(
              "mt-4 w-full rounded-2xl border border-stone-200/70 bg-white/65 px-4 py-3 text-sm text-ink/85 shadow-sm shadow-stone-900/5 outline-none",
              "focus:ring-2 focus:ring-copper/25",
            )}
            placeholder="Type your recall…"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" disabled={busy || !section?.extractedText} onClick={() => void loadQuestion()}>
              Continue
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => next()}>
              Skip
            </Button>
          </div>
        </GlassCard>
      ) : null}

      {phase === "mcq" && question ? (
        <GlassCard className="p-5 sm:p-6">
          <div className="text-sm font-semibold text-ink">Multiple choice</div>
          <div className="mt-3 text-[15px] leading-relaxed text-ink/80">{question.prompt}</div>
          <div className="mt-4 grid gap-2">
            {question.choices.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left text-sm transition",
                  selected === i
                    ? "border-blush-dust/55 bg-white/80 text-ink shadow-sm shadow-stone-900/5"
                    : "border-stone-200/70 bg-white/60 text-ink/75 hover:bg-white/75",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" disabled={busy || selected == null} onClick={() => void submitMcq()}>
              Submit
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => next()}>
              Skip
            </Button>
          </div>
        </GlassCard>
      ) : null}

      {phase === "feedback" && question ? (
        <GlassCard className="p-5 sm:p-6">
          <div className="text-sm font-semibold text-ink">{correct ? "Correct" : "Not quite"}</div>
          <p className="mt-2 text-sm text-ink/60">{question.explanation}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={() => next()}>
              Next concept
            </Button>
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}

