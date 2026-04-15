"use client";

import * as React from "react";
import { BookMarked, Download, Home, Upload } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { useStudyStore } from "@/stores/useStudyStore";

function greetingForTara() {
  const h = new Date().getHours();
  if (h < 5) return "Welcome back, Tara ❤️";
  if (h < 12) return "Good morning, Tara";
  if (h < 17) return "Good afternoon, Tara";
  return "Welcome back, Tara ❤️";
}

/** Same string on server + first client paint to avoid hydration mismatch (React #418). */
const GREETING_PLACEHOLDER = "Welcome, Tara";

export function StudyHeader(props: { onImportClick: () => void; onExport: () => void }) {
  const selectedSectionId = useStudyStore((s) => s.selectedSectionId);
  const selectSection = useStudyStore((s) => s.selectSection);
  const uploadBusy = useStudyStore((s) => s.uploadBusy);

  const [greeting, setGreeting] = React.useState(GREETING_PLACEHOLDER);

  React.useLayoutEffect(() => {
    setGreeting(greetingForTara());
  }, []);

  return (
    <GlassCard className="mb-5 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-200/80">
            Taraform
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
            {greeting}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-white/60">
            Calm, grounded study for nursing grad school — one section at a time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedSectionId ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => selectSection(null)}>
              <Home className="h-4 w-4" />
              Library
            </Button>
          ) : null}
          <Button type="button" variant="default" size="sm" onClick={props.onExport}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={props.onImportClick}>
            <Upload className="h-4 w-4" />
            Import backup
          </Button>
          <div className="hidden items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs text-white/45 sm:flex">
            <BookMarked className="h-3.5 w-3.5" />
            {uploadBusy ? "Processing upload…" : "Local only — your data stays on this device"}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
