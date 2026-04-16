"use client";

import * as React from "react";

import { NotesModal } from "@/components/notes/NotesModal";
import { useStudyStore } from "@/stores/useStudyStore";

function chapterKey(chapterNumber: number | null | undefined, chapterTitle: string | null | undefined) {
  const n = chapterNumber ?? "—";
  const t = chapterTitle ?? "Chapter";
  return `${n}::${t}`;
}

export function NotesView() {
  const sections = useStudyStore((s) => s.sections);
  const selectedSectionId = useStudyStore((s) => s.selectedSectionId);

  const chapters = React.useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const s of sections) {
      const id = chapterKey(s.chapterNumber, s.chapterTitle);
      if (!map.has(id)) {
        const label = s.chapterNumber != null ? `Chapter ${s.chapterNumber}: ${s.chapterTitle || "Untitled"}` : (s.chapterTitle || "Chapter");
        map.set(id, { id, label });
      }
    }
    return Array.from(map.values());
  }, [sections]);

  const defaultChapterId = React.useMemo(() => {
    const sec = sections.find((s) => s.id === selectedSectionId);
    if (!sec) return null;
    return chapterKey(sec.chapterNumber, sec.chapterTitle);
  }, [sections, selectedSectionId]);

  return <NotesModal defaultChapterId={defaultChapterId} chapters={chapters} />;
}
