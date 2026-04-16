"use client";

import * as React from "react";
import { BookOpen, ChevronDown } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { StudySection } from "@/stores/useStudyStore";
import { useStudyStore } from "@/stores/useStudyStore";

function chapterKey(s: StudySection) {
  return `${s.chapterNumber}::${s.chapterTitle}`;
}

export function Sidebar() {
  const sections = useStudyStore((s) => s.sections);
  const selectedSectionId = useStudyStore((s) => s.selectedSectionId);
  const selectSection = useStudyStore((s) => s.selectSection);
  const quizAttempts = useStudyStore((s) => s.quizAttempts);

  const groups = React.useMemo(() => {
    const map = new Map<string, StudySection[]>();
    for (const s of sections) {
      const k = chapterKey(s);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return Array.from(map.entries());
  }, [sections]);

  const [open, setOpen] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setOpen((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const firstKey = groups[0]?.[0];
      return firstKey ? { [firstKey]: true } : prev;
    });
  }, [groups]);

  if (sections.length === 0) {
    return (
      <GlassCard className="p-5">
        <div className="text-sm font-medium text-ink">Chapters</div>
        <p className="mt-2 text-sm text-ink/55">Upload a scanned page — sections appear here automatically.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-0">
      <div className="flex items-center gap-2 border-b border-stone-200/70 bg-blush-medium/40 px-5 py-4">
        <BookOpen className="h-4 w-4 text-copper" />
        <div className="text-sm font-semibold text-ink">Your library</div>
      </div>
      <ScrollArea className="h-[calc(100dvh-200px)] px-3 pb-4 pt-2">
        <div className="space-y-2">
          {groups.map(([key, secs]) => {
            const isOpen = open[key] ?? false;
            return (
              <div key={key} className="glass rounded-2xl p-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm font-medium text-ink/90 hover:bg-blush-medium/50"
                  onClick={() => setOpen((s) => ({ ...s, [key]: !isOpen }))}
                >
                  <span className="min-w-0 truncate">
                    {secs[0]?.chapterNumber != null ? `Ch. ${secs[0].chapterNumber}: ` : ""}
                    {secs[0]?.chapterTitle || "Sections"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink/45 transition", isOpen && "rotate-180")} />
                </button>
                {isOpen ? (
                  <div className="mt-1 space-y-1">
                    {secs.map((s) => {
                      const active = s.id === selectedSectionId;
                      const attempts = quizAttempts[s.id] ?? [];
                      const last = attempts[attempts.length - 1];
                      const weak = (last?.scorePct ?? 100) < 70 && attempts.length > 0;
                      const strong = (last?.scorePct ?? 0) >= 85 && attempts.length > 0;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={cn(
                            "w-full rounded-xl px-2 py-2.5 text-left text-[13px] leading-snug text-ink/75 transition hover:bg-blush-medium/45",
                            active &&
                              "border border-blush-dust/40 bg-white/80 text-ink shadow-sm shadow-stone-900/5",
                          )}
                          onClick={() => selectSection(s.id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 truncate font-medium">{s.title || "[Untitled]"}</div>
                            {weak ? <span className="h-2 w-2 shrink-0 rounded-full bg-red-500/80" /> : null}
                            {!weak && strong ? <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500/80" /> : null}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-ink/45">
                            {(s.keyConcepts ?? []).slice(0, 2).join(" · ") || "Tap to study"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </GlassCard>
  );
}
