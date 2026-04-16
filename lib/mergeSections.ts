import type { StructureResult } from "@/lib/openai";

function normTitle(title: string) {
  return title.trim().toLowerCase();
}

/**
 * Merge multiple structure responses: union sections by title (case-insensitive),
 * merge concept lists without duplicates.
 */
export function mergeStructureChunks(results: StructureResult[]): StructureResult {
  const byTitle = new Map<
    string,
    { title: string; summary?: string; concepts: string[] }
  >();

  for (const r of results) {
    for (const s of r.sections) {
      const key = normTitle(s.title);
      if (!key) continue;

      const concepts = (s.concepts ?? []).map((c) => c.trim()).filter(Boolean);
      const existing = byTitle.get(key);
      if (!existing) {
        byTitle.set(key, {
          title: s.title.trim(),
          summary: s.summary?.trim() || undefined,
          concepts: Array.from(new Set(concepts)),
        });
      } else {
        const mergedConcepts = new Set([...existing.concepts, ...concepts]);
        existing.concepts = Array.from(mergedConcepts);
        if (!existing.summary && s.summary?.trim()) {
          existing.summary = s.summary.trim();
        }
      }
    }
  }

  return { sections: Array.from(byTitle.values()) };
}
