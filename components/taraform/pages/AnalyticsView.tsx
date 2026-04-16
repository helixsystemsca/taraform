"use client";

import * as React from "react";
import Link from "next/link";

import { AnalyticsPanel } from "@/components/taraform/AnalyticsPanel";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/useStudyStore";

export function AnalyticsView() {
  const sections = useStudyStore((s) => s.sections);
  const quizAttempts = useStudyStore((s) => s.quizAttempts);
  const selectSection = useStudyStore((s) => s.selectSection);
  const timeSpent = useStudyStore((s) => s.timeSpent);

  const rows = React.useMemo(() => {
    return sections.map((s) => {
      const attempts = quizAttempts[s.id] ?? [];
      const avgScore =
        attempts.length > 0
          ? Math.round(attempts.reduce((a, x) => a + x.scorePct, 0) / attempts.length)
          : null;
      const last = attempts[attempts.length - 1] ?? null;
      const last3 = attempts.slice(-3);
      const last3Avg =
        last3.length > 0 ? last3.reduce((a, x) => a + x.scorePct, 0) / last3.length : null;
      const prev3 = attempts.slice(-6, -3);
      const prev3Avg =
        prev3.length > 0 ? prev3.reduce((a, x) => a + x.scorePct, 0) / prev3.length : null;
      const lowImprovement =
        last3Avg != null && prev3Avg != null ? last3Avg - prev3Avg < 5 : false;
      const weak = (last?.scorePct ?? 100) < 70 || (attempts.length >= 4 && lowImprovement && (last3Avg ?? 100) < 75);
      const strong = (last?.scorePct ?? 0) >= 85 && attempts.length >= 1;
      return {
        id: s.id,
        title: s.title,
        chapter: s.chapterTitle,
        attempts: attempts.length,
        avgScore,
        lastScore: last?.scorePct ?? null,
        lastAt: last?.attemptedAt ?? null,
        weak,
        strong,
      };
    });
  }, [quizAttempts, sections]);

  const weakSections = rows.filter((r) => r.weak);
  const strongSections = rows.filter((r) => r.strong);

  const recent = React.useMemo(() => {
    const events: Array<{ sectionId: string; title: string; at: number; score: number }> = [];
    for (const r of rows) {
      const attempts = quizAttempts[r.id] ?? [];
      for (const a of attempts.slice(-10)) {
        events.push({ sectionId: r.id, title: r.title, at: a.attemptedAt, score: a.scorePct });
      }
    }
    events.sort((a, b) => b.at - a.at);
    return events.slice(0, 10);
  }, [quizAttempts, rows]);

  const recommendations = React.useMemo(() => {
    const recs: string[] = [];
    if (weakSections[0]) recs.push(`Review “${weakSections[0].title}” — score trend is under 70%.`);
    const retake = rows.find((r) => (r.lastScore ?? 100) < 70 && r.attempts >= 1);
    if (retake) recs.push(`Retake the quiz for “${retake.title}”.`);
    const improved = rows
      .map((r) => {
        const a = quizAttempts[r.id] ?? [];
        const last3 = a.slice(-3);
        const prev3 = a.slice(-6, -3);
        if (last3.length < 2 || prev3.length < 2) return null;
        const last3Avg = last3.reduce((x, y) => x + y.scorePct, 0) / last3.length;
        const prev3Avg = prev3.reduce((x, y) => x + y.scorePct, 0) / prev3.length;
        return { title: r.title, delta: last3Avg - prev3Avg };
      })
      .filter(Boolean)
      .sort((a, b) => (b!.delta ?? 0) - (a!.delta ?? 0))[0];
    if (improved && (improved as { delta: number }).delta >= 8) {
      recs.push(`You improved in “${(improved as { title: string }).title}” — keep going.`);
    }
    if (recs.length === 0) recs.push("Keep building momentum — take a short quiz on a new section.");
    return recs.slice(0, 4);
  }, [quizAttempts, rows, weakSections]);

  const focusSectionId = (weakSections[0]?.id ?? rows[0]?.id) || "";

  if (sections.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="font-display text-base font-semibold text-ink">No analytics yet</div>
        <p className="mt-2 text-sm text-ink/60">
          Add sections from Home and take a quiz on Study — charts appear once there is time or quiz data.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-5">
      <GlassCard className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="font-display text-lg font-semibold text-ink">Analytics</div>
            <p className="mt-1 text-sm text-ink/55">Performance + study recommendations from your quiz attempts.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-stone-200/70 bg-white/60 px-4 py-3 text-sm text-ink/70">
              <span className="font-semibold text-ink">{weakSections.length}</span> weak
            </div>
            <div className="rounded-2xl border border-stone-200/70 bg-white/60 px-4 py-3 text-sm text-ink/70">
              <span className="font-semibold text-ink">{strongSections.length}</span> strong
            </div>
            <div className="rounded-2xl border border-stone-200/70 bg-white/60 px-4 py-3 text-sm text-ink/70">
              <span className="font-semibold text-ink">
                {rows.reduce((a, r) => a + (r.attempts || 0), 0)}
              </span>{" "}
              attempts
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <div className="font-display text-base font-semibold text-ink">Recommendations</div>
          <ul className="mt-3 space-y-2 text-sm text-ink/70">
            {recommendations.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-copper" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          {weakSections[0] ? (
            <div className="mt-4 flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  selectSection(weakSections[0]!.id);
                }}
                asChild
              >
                <Link href="/study">Open weakest</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/study">Study</Link>
              </Button>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard className="p-5">
          <div className="font-display text-base font-semibold text-ink">Recent activity</div>
          <div className="mt-3 space-y-2">
            {recent.length === 0 ? (
              <div className="text-sm text-ink/55">No quiz attempts yet.</div>
            ) : (
              recent.map((e) => (
                <button
                  key={`${e.sectionId}:${e.at}`}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-stone-200/70 bg-white/55 px-4 py-3 text-left text-sm text-ink/75 hover:bg-white/70"
                  onClick={() => selectSection(e.sectionId)}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink/85">{e.title}</div>
                    <div className="mt-0.5 text-[11px] text-ink/45">{new Date(e.at).toLocaleString()}</div>
                  </div>
                  <div
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums",
                      e.score < 70
                        ? "border-red-200 bg-red-50 text-red-800"
                        : e.score >= 85
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-stone-200/70 bg-white/60 text-ink/70",
                    )}
                  >
                    {e.score}%
                  </div>
                </button>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <div className="font-display text-base font-semibold text-ink">Scores by section</div>
        <p className="mt-1 text-xs text-ink/50">Average score from completed quizzes. Time spent included for context.</p>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {rows
            .slice()
            .sort((a, b) => (a.avgScore ?? 0) - (b.avgScore ?? 0))
            .map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectSection(r.id)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/70 bg-white/55 px-4 py-3 text-left text-sm hover:bg-white/70"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink/85">{r.title}</div>
                  <div className="mt-0.5 text-[11px] text-ink/45">
                    {r.attempts} attempt{r.attempts === 1 ? "" : "s"} · {(timeSpent[r.id] ?? 0) ? `${Math.round((timeSpent[r.id] ?? 0) / 60)} min` : "0 min"}
                  </div>
                </div>
                <div
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums",
                    (r.avgScore ?? 0) < 70
                      ? "border-red-200 bg-red-50 text-red-800"
                      : (r.avgScore ?? 0) >= 85
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-stone-200/70 bg-white/60 text-ink/70",
                  )}
                >
                  {r.avgScore == null ? "—" : `${r.avgScore}%`}
                </div>
              </button>
            ))}
        </div>
      </GlassCard>

      {focusSectionId ? <AnalyticsPanel sectionId={focusSectionId} /> : null}
    </div>
  );
}
