"use client";

import * as React from "react";
import Link from "next/link";

import { SectionView } from "@/components/taraform/SectionView";
import { Sidebar } from "@/components/taraform/Sidebar";
import { StudyFocusCard } from "@/components/taraform/StudyFocusCard";
import { GlassCard } from "@/components/glass/GlassCard";
import { useStudyStore } from "@/stores/useStudyStore";

export function StudyView() {
  const selectedSectionId = useStudyStore((s) => s.selectedSectionId);
  const exportSnapshot = useStudyStore((s) => s.exportSnapshot);
  const importSnapshot = useStudyStore((s) => s.importSnapshot);

  const importRef = React.useRef<HTMLInputElement>(null);

  function onExport() {
    const blob = new Blob([exportSnapshot()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taraform-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    void f.text().then((txt) => {
      try {
        importSnapshot(txt);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not import file.");
      } finally {
        e.target.value = "";
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={onImportFile}
      />

      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onExport}
          className="rounded-lg border border-[rgba(120,90,80,0.12)] bg-surface-panel/90 px-3 py-2 text-xs font-medium text-ink-secondary transition-editorial hover:border-copper/25 hover:text-ink"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          className="rounded-lg bg-copper px-3 py-2 text-xs font-medium text-[#fbf8f4] shadow-warm transition-editorial hover:bg-rose-deep hover:shadow-warm-hover active:scale-[0.99]"
        >
          Import backup
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside className="min-h-0 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-7.5rem)] lg:self-start lg:overflow-y-auto">
          <Sidebar />
        </aside>

        <div className="relative min-h-[320px] min-w-0 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto">
          {selectedSectionId ? (
            <>
              <SectionView sectionId={selectedSectionId} />
              <div className="pointer-events-none fixed bottom-24 right-4 z-30 sm:bottom-8 sm:right-8 lg:bottom-10 lg:right-10">
                <StudyFocusCard className="pointer-events-auto" />
              </div>
            </>
          ) : (
            <GlassCard className="border border-[rgba(120,90,80,0.08)] p-8 shadow-warm">
              <div className="font-display text-xl font-medium tracking-[-0.02em] text-ink">Choose a section</div>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-secondary">
                Upload a page on{" "}
                <Link href="/home" className="font-medium text-rose-deep underline-offset-2 hover:underline">
                  Home
                </Link>
                , then open a section from the library — or expand a chapter in the list.
              </p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
