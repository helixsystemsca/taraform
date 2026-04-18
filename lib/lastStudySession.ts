export const LAST_STUDY_KEY = "taraform_last_study";

export type LastStudySnapshot = {
  unitId: string;
  pdfTitle: string;
  stickyCount: number;
  updatedAt: number;
};

export function loadLastStudy(): LastStudySnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_STUDY_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.unitId !== "string" || typeof o.pdfTitle !== "string") return null;
    return {
      unitId: o.unitId,
      pdfTitle: o.pdfTitle,
      stickyCount: typeof o.stickyCount === "number" ? o.stickyCount : 0,
      updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveLastStudy(patch: Partial<LastStudySnapshot> & Pick<LastStudySnapshot, "unitId" | "pdfTitle">) {
  if (typeof window === "undefined") return;
  const prev = loadLastStudy();
  const next: LastStudySnapshot = {
    unitId: patch.unitId,
    pdfTitle: patch.pdfTitle,
    stickyCount: patch.stickyCount ?? prev?.stickyCount ?? 0,
    updatedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(LAST_STUDY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function updateLastStudyStickyCount(count: number) {
  const prev = loadLastStudy();
  if (!prev) return;
  try {
    window.localStorage.setItem(
      LAST_STUDY_KEY,
      JSON.stringify({ ...prev, stickyCount: count, updatedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

/** Rough “today study minutes” mock + optional persisted hint */
const MINUTES_KEY = "taraform_study_minutes_today";
const DAY_KEY = "taraform_study_minutes_day";

export function bumpStudyMinutesToday(deltaMinutes: number) {
  if (typeof window === "undefined" || deltaMinutes <= 0) return;
  const day = new Date().toDateString();
  let storedDay = "";
  let minutes = 0;
  try {
    storedDay = window.localStorage.getItem(DAY_KEY) ?? "";
    minutes = Number(window.localStorage.getItem(MINUTES_KEY) ?? "0") || 0;
  } catch {
    return;
  }
  if (storedDay !== day) {
    minutes = 0;
  }
  minutes += deltaMinutes;
  try {
    window.localStorage.setItem(DAY_KEY, day);
    window.localStorage.setItem(MINUTES_KEY, String(Math.min(999, minutes)));
  } catch {
    /* ignore */
  }
}

export function readStudyMinutesToday(): number {
  if (typeof window === "undefined") return 0;
  try {
    const day = new Date().toDateString();
    const storedDay = window.localStorage.getItem(DAY_KEY) ?? "";
    if (storedDay !== day) return 0;
    return Number(window.localStorage.getItem(MINUTES_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}
