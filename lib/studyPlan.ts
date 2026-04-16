import type { QuizAttempt, StudySection } from "@/stores/useStudyStore";

export type StudyPlanItem = {
  sectionId: string;
  title: string;
  reason: string;
  priority: number; // higher = sooner
};

type Inputs = {
  sections: StudySection[];
  quizAttempts: Record<string, QuizAttempt[]>;
  timeSpent: Record<string, number>;
  limit?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lastAttempt(attempts: QuizAttempt[]) {
  return attempts.length ? attempts[attempts.length - 1]! : null;
}

function daysSince(ts: number | null) {
  if (!ts) return Infinity;
  return (Date.now() - ts) / (24 * 60 * 60 * 1000);
}

function computePriority(section: StudySection, attempts: QuizAttempt[], timeSec: number) {
  const last = lastAttempt(attempts);
  const lastScore = last?.scorePct ?? null;
  const lastAt = last?.attemptedAt ?? null;
  const d = daysSince(lastAt);

  // Weakness / improvement heuristics.
  const last3 = attempts.slice(-3);
  const prev3 = attempts.slice(-6, -3);
  const last3Avg = last3.length ? last3.reduce((a, x) => a + x.scorePct, 0) / last3.length : null;
  const prev3Avg = prev3.length ? prev3.reduce((a, x) => a + x.scorePct, 0) / prev3.length : null;
  const lowImprovement = last3Avg != null && prev3Avg != null ? last3Avg - prev3Avg < 5 : false;

  const weak = (lastScore ?? 100) < 70 || (attempts.length >= 4 && lowImprovement && (last3Avg ?? 100) < 75);
  const strong = (lastScore ?? 0) >= 85 && attempts.length >= 1;

  const notRecent = d >= 7 || lastAt == null;
  const recentlyStudied = d < 2;

  let priority = 0;
  let reason = "";

  if (weak) {
    priority = 100 + (70 - (lastScore ?? 60));
    reason = `Weak (last score ${lastScore ?? "—"}%)`;
  } else if (notRecent) {
    priority = 60 + clamp(d * 2, 0, 30);
    reason = lastAt ? `Not studied recently (${Math.round(d)}d)` : "New / not quizzed yet";
  } else if (strong) {
    priority = 25 + clamp(d * 2, 0, 10);
    reason = "Maintenance";
  } else {
    priority = 40 + clamp(d * 2, 0, 20);
    reason = "Continue building accuracy";
  }

  // Time spent without quiz bumps priority a bit.
  if (!attempts.length && timeSec >= 6 * 60) {
    priority += 10;
    reason = "Studied but not quizzed yet";
  }

  // Recently studied should sink unless weak.
  if (recentlyStudied && !weak) priority -= 15;

  return { priority, reason };
}

export function generateStudyPlan({ sections, quizAttempts, timeSpent, limit = 4 }: Inputs): StudyPlanItem[] {
  const scored = sections.map((s) => {
    const attempts = quizAttempts[s.id] ?? [];
    const timeSec = timeSpent[s.id] ?? 0;
    const { priority, reason } = computePriority(s, attempts, timeSec);
    return { sectionId: s.id, title: s.title, priority, reason };
  });

  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, clamp(limit, 3, 5));
}

