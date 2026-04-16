"use client";

import * as React from "react";
import Link from "next/link";

import { SectionView } from "@/components/taraform/SectionView";
import { Sidebar } from "@/components/taraform/Sidebar";
import { StudyHeader } from "@/components/taraform/StudyHeader";
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
    <div className="space-y-5 pb-6">
      <StudyHeader onImportClick={() => importRef.current?.click()} onExport={onExport} />
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={onImportFile}
      />

      <div className="flex flex-col gap-5 lg:flex-row">
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1">
          {selectedSectionId ? (
            <SectionView sectionId={selectedSectionId} />
          ) : (
            <GlassCard className="p-6 sm:p-8">
              <div className="font-display text-lg font-semibold text-ink">Choose a section</div>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                Upload a page on{" "}
                <Link href="/home" className="font-medium text-copper underline-offset-2 hover:underline">
                  Home
                </Link>
                , then tap a section card — or use the chapter list on larger screens.
              </p>
            </GlassCard>
          )}
        </main>
      </div>
    </div>
  );
}
