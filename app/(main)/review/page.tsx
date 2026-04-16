"use client";

import * as React from "react";
import Link from "next/link";

import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { getDeviceId } from "@/lib/srs/device";
import type { ConceptRow } from "@/lib/srs/types";
import { supabaseBrowser } from "@/lib/supabase";

export default function ReviewPage() {
  const deviceId = React.useMemo(() => getDeviceId(), []);
  const [due, setDue] = React.useState<ConceptRow[]>([]);

  React.useEffect(() => {
    if (!deviceId) return;
    const supabase = supabaseBrowser();
    const nowIso = new Date().toISOString();
    void supabase
      .from("concepts")
      .select("*")
      .eq("device_id", deviceId)
      .lte("next_review", nowIso)
      .order("strength", { ascending: true })
      .limit(50)
      .then(({ data }) => setDue((data as ConceptRow[] | null) ?? []));
  }, [deviceId]);

  return (
    <div className="space-y-5">
      <GlassCard className="p-6">
        <div className="font-display text-lg font-semibold text-ink">Review</div>
        <p className="mt-1 text-sm text-ink/55">Due concepts are queued weakest-first.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-stone-200/70 bg-white/60 px-4 py-3 text-sm text-ink/70">
            <span className="font-semibold text-ink">{due.length}</span> due now
          </div>
          <Button asChild variant="primary" disabled={due.length === 0}>
            <Link href="/session">Start session</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/concepts">Manage concepts</Link>
          </Button>
        </div>
      </GlassCard>

      {due.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {due.slice(0, 10).map((c) => (
            <GlassCard key={c.id} className="p-5">
              <div className="text-sm font-semibold text-ink">{c.concept}</div>
              <div className="mt-2 text-xs text-ink/55">
                Strength {(c.strength * 100).toFixed(0)}% · Next {new Date(c.next_review).toLocaleString()}
              </div>
            </GlassCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}

