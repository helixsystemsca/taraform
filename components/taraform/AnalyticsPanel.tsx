"use client";

import * as React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GlassCard } from "@/components/glass/GlassCard";
import type { QuizResult } from "@/stores/useStudyStore";
import { useStudyStore } from "@/stores/useStudyStore";

function shortTitle(title: string, max = 22) {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1)}…`;
}

function buildSuggestion(
  sections: { id: string; title: string }[],
  quizResults: Record<string, QuizResult[]>,
  timeSpent: Record<string, number>,
) {
  let worst: { id: string; title: string; score: number; reason: string } | null = null;
  for (const s of sections) {
    const results = quizResults[s.id] ?? [];
    const time = timeSpent[s.id] ?? 0;
    const avgConf =
      results.length > 0
        ? results.reduce((a, r) => a + r.confidence, 0) / results.length
        : 100;
    const success =
      results.length > 0 ? results.filter((r) => r.isCorrect).length / results.length : 1;

    let score = 0;
    let reason = "";
    if (results.length && avgConf < 70) {
      score = 100 - avgConf;
      reason = "low confidence detected";
    } else if (time > 240 && success < 0.55 && results.length >= 2) {
      score = 60 + time / 60;
      reason = "high study time with mixed accuracy";
    }
    if (score > 0 && (!worst || score > worst.score)) {
      worst = { id: s.id, title: s.title, score, reason };
    }
  }
  if (!worst) {
    return "Keep building momentum — take a short quiz on your newest section when you’re ready.";
  }
  return `Review “${worst.title}” — ${worst.reason}.`;
}

const TICK = "#6b5b52";
const GRID = "rgba(120, 113, 108, 0.12)";

export function AnalyticsPanel(props: { sectionId: string }) {
  const sections = useStudyStore((s) => s.sections);
  const quizResults = useStudyStore((s) => s.quizResults);
  const timeSpent = useStudyStore((s) => s.timeSpent);

  const chartData = React.useMemo(() => {
    return sections.map((s) => {
      const results = quizResults[s.id] ?? [];
      const avgConf =
        results.length > 0
          ? Math.round(results.reduce((a, r) => a + r.confidence, 0) / results.length)
          : 0;
      return {
        id: s.id,
        name: shortTitle(s.title),
        timeMin: Math.round(((timeSpent[s.id] ?? 0) / 60) * 10) / 10,
        avgConfidence: avgConf,
      };
    });
  }, [sections, quizResults, timeSpent]);

  const suggestion = React.useMemo(
    () => buildSuggestion(sections, quizResults, timeSpent),
    [sections, quizResults, timeSpent],
  );

  const currentAvg =
    (quizResults[props.sectionId] ?? []).length > 0
      ? Math.round(
          (quizResults[props.sectionId] ?? []).reduce((a, r) => a + r.confidence, 0) /
            (quizResults[props.sectionId] ?? []).length,
        )
      : null;

  const hasData = sections.some((s) => (timeSpent[s.id] ?? 0) > 0 || (quizResults[s.id]?.length ?? 0) > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard className="p-5">
        <div className="font-display text-base font-semibold text-ink">Study insight</div>
        <p className="mt-2 text-sm leading-relaxed text-ink/65">{suggestion}</p>
        {currentAvg != null ? (
          <p className="mt-3 text-xs text-ink/45">This section’s average confidence: {currentAvg}%</p>
        ) : (
          <p className="mt-3 text-xs text-ink/45">No quiz data for this section yet.</p>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <div className="font-display text-base font-semibold text-ink">Time & confidence</div>
        <p className="mt-1 text-xs text-ink/50">Minutes studied vs. average self-reported confidence.</p>
        <div className="mt-4 h-[260px] w-full">
          {!hasData ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-stone-200/70 bg-blush-medium/40 text-sm text-ink/55">
              Take a quiz to unlock charts.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: TICK, fontSize: 10 }} interval={0} angle={-16} textAnchor="end" height={54} />
                <YAxis yAxisId="left" tick={{ fill: TICK, fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: TICK, fontSize: 10 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(253, 245, 242, 0.96)",
                    border: "1px solid rgba(232, 210, 201, 0.9)",
                    borderRadius: 14,
                    color: "#3d2b1f",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "rgba(61, 43, 31, 0.65)" }} />
                <Bar yAxisId="left" dataKey="timeMin" name="Minutes" fill="rgba(232, 210, 201, 0.85)" radius={[8, 8, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="avgConfidence" name="Avg confidence %" stroke="rgba(184, 122, 107, 0.95)" strokeWidth={2} dot={{ fill: "rgba(184, 122, 107, 0.95)" }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
