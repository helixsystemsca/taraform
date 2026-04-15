import type { TextbookExtraction } from "@/lib/ai/schemas";
import type { StudySection } from "@/stores/useStudyStore";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Flatten AI extraction into persisted study sections. */
export function mapExtractionToSections(doc: TextbookExtraction): StudySection[] {
  const out: StudySection[] = [];
  for (const ch of doc.chapters) {
    for (const sec of ch.sections) {
      out.push({
        id: newId(),
        chapterNumber: ch.chapterNumber,
        chapterTitle: ch.title,
        title: sec.sectionTitle,
        extractedText: sec.extractedText,
        keyConcepts: sec.keyConcepts ?? [],
        pageNumber: sec.pageNumberEstimate,
      });
    }
  }
  return out;
}
