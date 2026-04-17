import { NextResponse } from "next/server";
import { z } from "zod";

import { supabaseServer } from "@/lib/supabase/server";

const BodySchema = z.object({
  device_id: z.string().min(6),
  concept_id: z.string().min(1),
  correct: z.boolean(),
});

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const { device_id, concept_id, correct } = parsed.data;
  const supabase = await supabaseServer();

  const { data: row, error: fetchErr } = await supabase
    .from("concepts")
    .select("id,device_id,strength,stability")
    .eq("id", concept_id)
    .eq("device_id", device_id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const now = Date.now();
  const strength = clamp(row.strength + (correct ? 0.1 : -0.2), 0, 1);
  const stability = clamp(row.stability * (correct ? 1.5 : 0.6), 0.2, 60);

  const nextReview = new Date(now + stability * 24 * 60 * 60 * 1000).toISOString();
  const lastReviewed = new Date(now).toISOString();

  const { data: updated, error: updErr } = await supabase
    .from("concepts")
    .update({
      strength,
      stability,
      last_reviewed: lastReviewed,
      next_review: nextReview,
      updated_at: new Date(now).toISOString(),
    })
    .eq("id", concept_id)
    .eq("device_id", device_id)
    .select("id,device_id,section_id,concept,strength,stability,last_reviewed,next_review,created_at,updated_at")
    .maybeSingle();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ concept: updated });
}

