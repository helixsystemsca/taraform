"use client";

import * as React from "react";

import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { getDeviceId } from "@/lib/srs/device";
import type { ConceptRow } from "@/lib/srs/types";
import { supabaseBrowser } from "@/lib/supabase";
import { useStudyStore } from "@/stores/useStudyStore";

export default function ConceptsPage() {
  const sections = useStudyStore((s) => s.sections);
  const [busy, setBusy] = React.useState(false);
  const [concepts, setConcepts] = React.useState<ConceptRow[]>([]);
  const [selectedSectionId, setSelectedSectionId] = React.useState<string | "all">("all");

  const deviceId = React.useMemo(() => getDeviceId(), []);

  async function refresh() {
    if (!deviceId) return;
    const supabase = supabaseBrowser();
    let q = supabase.from("concepts").select("*").eq("device_id", deviceId);
    if (selectedSectionId !== "all") q = q.eq("section_id", selectedSectionId);
    const { data } = await q.order("next_review", { ascending: true });
    setConcepts((data as ConceptRow[] | null) ?? []);
  }

  React.useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, selectedSectionId]);

  async function generateForSection(sectionId: string) {
    if (!deviceId) return;
    const s = sections.find((x) => x.id === sectionId);
    if (!s) return;
    setBusy(true);
    try {
      await fetch("/api/generate-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          section_id: s.id,
          section_title: s.title ?? "Untitled",
          extracted_text: s.extractedText ?? "",
        }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (sections.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="font-display text-base font-semibold text-ink">No concepts yet</div>
        <p className="mt-2 text-sm text-ink/60">Upload a page on Home to create sections first.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-display text-lg font-semibold text-ink">Concepts</div>
            <p className="mt-1 text-sm text-ink/55">Generate and track spaced repetition concepts per section.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value as "all" | string)}
              className="rounded-xl border border-stone-200/70 bg-white/65 px-3 py-2 text-sm text-ink/80 shadow-sm shadow-stone-900/5 outline-none focus:ring-2 focus:ring-copper/25"
            >
              <option value="all">All sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || "Untitled"}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              disabled={busy || selectedSectionId === "all"}
              onClick={() => {
                if (selectedSectionId !== "all") void generateForSection(selectedSectionId);
              }}
            >
              Generate concepts
            </Button>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-3 lg:grid-cols-2">
        {concepts.map((c) => (
          <GlassCard key={c.id} className="p-5">
            <div className="text-sm font-semibold text-ink">{c.concept}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink/55">
              <span className="rounded-full border border-stone-200/70 bg-white/55 px-2.5 py-1">
                Strength {(c.strength * 100).toFixed(0)}%
              </span>
              <span className="rounded-full border border-stone-200/70 bg-white/55 px-2.5 py-1">
                Stability {c.stability.toFixed(2)}d
              </span>
              <span className="rounded-full border border-stone-200/70 bg-white/55 px-2.5 py-1">
                Next {new Date(c.next_review).toLocaleString()}
              </span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

