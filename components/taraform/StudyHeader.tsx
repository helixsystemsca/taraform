"use client";

import * as React from "react";
import { BookMarked, Download, Home, Upload } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { TaraformLogo } from "@/components/taraform/TaraformLogo";
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
    <GlassCard className="mb-8 px-6 py-6 sm:px-8 sm:py-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <TaraformLogo variant="header" />
          <h1 className="font-display mt-3 text-2xl font-medium tracking-[-0.03em] text-ink sm:text-3xl">
            {greeting}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
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
          <div className="hidden items-center gap-1.5 rounded-full border border-[rgba(120,90,80,0.1)] bg-rose-light/40 px-3 py-1.5 text-xs font-medium text-ink-secondary sm:flex">
            <BookMarked className="h-3.5 w-3.5 text-copper" />
            {uploadBusy ? "Processing upload…" : "Local only — your data stays on this device"}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
