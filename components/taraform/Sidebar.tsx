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
        <div className="text-sm font-medium text-white/90">Chapters</div>
        <p className="mt-2 text-sm text-white/55">Upload a scanned page — sections appear here automatically.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-0">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
        <BookOpen className="h-4 w-4 text-emerald-200/90" />
        <div className="text-sm font-semibold text-white">Your library</div>
      </div>
      <ScrollArea className="h-[calc(100dvh-200px)] px-3 pb-4 pt-2">
        <div className="space-y-2">
          {groups.map(([key, secs]) => {
            const isOpen = open[key] ?? false;
            return (
              <div key={key} className="glass rounded-2xl p-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm font-medium text-white/90 hover:bg-white/6"
                  onClick={() => setOpen((s) => ({ ...s, [key]: !isOpen }))}
                >
                  <span className="min-w-0 truncate">
                    {secs[0]?.chapterNumber != null ? `Ch. ${secs[0].chapterNumber}: ` : ""}
                    {secs[0]?.chapterTitle || "Sections"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-white/55 transition", isOpen && "rotate-180")} />
                </button>
                {isOpen ? (
                  <div className="mt-1 space-y-1">
                    {secs.map((s) => {
                      const active = s.id === selectedSectionId;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={cn(
                            "w-full rounded-xl px-2 py-2.5 text-left text-[13px] leading-snug text-white/78 transition hover:bg-white/6",
                            active &&
                              "bg-gradient-to-b from-white/14 to-white/10 text-white ring-1 ring-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
                          )}
                          onClick={() => selectSection(s.id)}
                        >
                          <div className="truncate font-medium">{s.title || "[Untitled]"}</div>
                          <div className="mt-0.5 truncate text-[11px] text-white/45">
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
