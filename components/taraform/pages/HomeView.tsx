"use client";

import * as React from "react";

import { Dashboard } from "@/components/taraform/Dashboard";
import { StudyHeader } from "@/components/taraform/StudyHeader";
import { useStudyStore } from "@/stores/useStudyStore";

export function HomeView() {
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
    <div className="space-y-8">
      <StudyHeader onImportClick={() => importRef.current?.click()} onExport={onExport} />
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={onImportFile}
      />
      <Dashboard />
    </div>
  );
}
