"use client";

import * as React from "react";

import { AnalyticsPanel } from "@/components/taraform/AnalyticsPanel";
import { GlassCard } from "@/components/glass/GlassCard";
import { useStudyStore } from "@/stores/useStudyStore";

export function AnalyticsView() {
  const sections = useStudyStore((s) => s.sections);
  const selectedSectionId = useStudyStore((s) => s.selectedSectionId);

  const sectionId = React.useMemo(() => {
    if (selectedSectionId && sections.some((s) => s.id === selectedSectionId)) {
      return selectedSectionId;
    }
    return sections[0]?.id ?? "";
  }, [sections, selectedSectionId]);

  if (sections.length === 0 || !sectionId) {
    return (
      <GlassCard className="p-6">
        <div className="font-display text-base font-semibold text-ink">No analytics yet</div>
        <p className="mt-2 text-sm text-ink/60">
          Add sections from Home and take a quiz on Study — charts appear once there is time or quiz data.
        </p>
      </GlassCard>
    );
  }

  return <AnalyticsPanel sectionId={sectionId} />;
}
