"use client";

import * as React from "react";
import { BookOpen, ChevronDown } from "lucide-react";

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
      const key = groups[0]?.[0];
      return key ? { [key]: true } : prev;
    });
  }, [groups]);

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-[rgba(120,90,80,0.08)] bg-surface-panel p-6 shadow-warm">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">Active projects</div>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Upload a scanned page — sections appear here as quiet cards you can open anytime.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[rgba(120,90,80,0.08)] bg-surface-panel shadow-warm">
      <div className="flex items-center gap-2 border-b border-[rgba(120,90,80,0.08)] px-5 py-4">
        <BookOpen className="h-4 w-4 text-copper" strokeWidth={1.5} />
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">Library</div>
          <div className="font-display text-sm font-medium text-ink">Your sections</div>
        </div>
      </div>
      <ScrollArea className="max-h-[min(70dvh,640px)] px-3 pb-4 pt-3 lg:max-h-[calc(100dvh-12rem)]">
        <div className="space-y-3">
          {groups.map(([key, secs]) => {
            const isOpen = open[key] ?? false;
            return (
              <div key={key} className="rounded-xl border border-[rgba(120,90,80,0.06)] bg-surface-page/60 p-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-medium text-ink transition-editorial hover:bg-black/[0.025]"
                  onClick={() => setOpen((s) => ({ ...s, [key]: !isOpen }))}
                >
                  <span className="min-w-0 truncate text-ink-secondary">
                    {secs[0]?.chapterNumber != null ? `Ch. ${secs[0].chapterNumber}: ` : ""}
                    {secs[0]?.chapterTitle || "Sections"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-muted transition-editorial", isOpen && "rotate-180")} />
                </button>
                {isOpen ? (
                  <div className="mt-2 space-y-2">
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
                            "group w-full rounded-lg border border-[rgba(120,90,80,0.06)] bg-surface-panel/80 px-3 py-3 text-left transition-editorial",
                            "hover:-translate-y-0.5 hover:border-[rgba(120,90,80,0.1)] hover:bg-[rgba(232,214,214,0.28)] hover:shadow-warm-hover",
                            active && "bg-rose-light/55 shadow-[inset_3px_0_0_0_#c58f8f] shadow-warm",
                          )}
                          onClick={() => selectSection(s.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-display text-[15px] font-medium leading-snug tracking-[-0.02em] text-ink">
                                {s.title || "[Untitled]"}
                              </div>
                              <div className="mt-1 line-clamp-2 text-xs italic leading-relaxed text-ink-secondary">
                                {(s.keyConcepts ?? []).slice(0, 2).join(" · ") || "Tap to read and quiz"}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                              {weak ? <span className="h-2 w-2 rounded-full bg-rose-deep/70" title="Needs review" /> : null}
                              {!weak && strong ? (
                                <span className="h-2 w-2 rounded-full bg-emerald-700/50" title="Strong" />
                              ) : null}
                            </div>
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
    </div>
  );
}
