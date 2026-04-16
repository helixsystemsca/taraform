"use client";

import * as React from "react";
import Image from "next/image";
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
    <GlassCard className="mb-5 px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Image src="/taraform.png" alt="Taraform" width={160} height={40} className="h-9 w-auto" priority />
          <h1 className="font-display mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
            {greeting}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/55">
            Calm, grounded study for nursing grad school — one section at a time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedSectionId ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => selectSection(null)}>
              <Home className="h-4 w-4 text-copper" />
              Library
            </Button>
          ) : null}
          <Button type="button" variant="default" size="sm" onClick={props.onExport}>
            <Download className="h-4 w-4 text-copper" />
            Export JSON
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={props.onImportClick}>
            <Upload className="h-4 w-4" />
            Import backup
          </Button>
          <div className="hidden items-center gap-1 rounded-full border border-stone-200/60 bg-blush-medium/50 px-2.5 py-1 text-xs text-ink/50 sm:flex">
            <BookMarked className="h-3.5 w-3.5 text-copper" />
            {uploadBusy ? "Processing upload…" : "Local only — your data stays on this device"}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
