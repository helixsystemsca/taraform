import { NextResponse } from "next/server";
import { z } from "zod";

import { supabaseServer } from "@/lib/supabase/server";
import { generateStructure, type DocumentType } from "@/lib/openai";
import { estimateTokens, sha256Hex } from "@/lib/hash";
import { getAiCache, putAiCache } from "@/lib/ai/cache";

const BodySchema = z.object({
  file_id: z.string().min(10),
  file_hash: z.string().min(16),
  section_id: z.string().min(1),
  section_title: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  chunks: z.array(z.string().min(1)).min(1),
});

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = authData.user.id;

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const { file_id, file_hash, section_id, section_title, keywords, chunks } = parsed.data;

  // DB cache first (strong guarantee: no OpenAI when already present).
  const { data: row, error: fetchErr } = await supabase
    .from("section_summaries")
    .select("summary_text,key_concepts,updated_at")
    .eq("user_id", userId)
    .eq("file_id", file_id)
    .eq("section_id", section_id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[section] section_summaries read error", fetchErr.message);
  } else if (row?.summary_text) {
    console.log("[section] CACHE HIT", { file_hash, section_id });
    return NextResponse.json({ summary_text: row.summary_text, key_concepts: row.key_concepts ?? [] });
  }

  console.log("[section] CACHE MISS", { file_hash, section_id });

  // AI cache (optional extra layer) keyed by content+doc type; still write-through to DB.
  const { data: processed } = await supabase
    .from("processed_files")
    .select("document_type")
    .eq("id", file_id)
    .maybeSingle();
  const documentType = (processed?.document_type as DocumentType | null) ?? "other";

  const joined = chunks.join("\n\n").slice(0, 8000);
  const cacheKey = sha256Hex(`sectiondetail:v1:${userId}:${file_hash}:${documentType}:${section_id}:${joined}`);
  const hit = await getAiCache(userId, cacheKey);
  if (hit) {
    console.log("[section] AI CACHE HIT", { section_id, tokensEstimate: estimateTokens(joined) });
    const payload = JSON.parse(hit.output_text) as { summary_text: string; key_concepts: string[] };
    await supabase
      .from("section_summaries")
      .upsert(
        { user_id: userId, file_id, section_id, summary_text: payload.summary_text, key_concepts: payload.key_concepts, updated_at: new Date().toISOString() },
        { onConflict: "user_id,file_id,section_id" },
      );
    return NextResponse.json(payload);
  }

  console.log("[section] AI CACHE MISS", { section_id, tokensEstimate: estimateTokens(joined) });

  const structured = await generateStructure(
    `SECTION: ${section_title}\nKEYWORDS: ${keywords.slice(0, 8).join(", ")}\n\nTEXT:\n${joined}`,
  );

  // Convert structured sections into a compact summary for this clicked section.
  const summary_text = structured.sections
    .slice(0, 3)
    .map((s) => `${s.title}\n${s.summary ?? ""}`.trim())
    .join("\n\n")
    .trim();
  const key_concepts = Array.from(
    new Set(structured.sections.flatMap((s) => s.concepts ?? []).map((c) => c.trim()).filter(Boolean)),
  ).slice(0, 20);

  const payload = { summary_text, key_concepts };

  await putAiCache({
    userId,
    inputHash: cacheKey,
    inputText: joined,
    outputText: JSON.stringify(payload),
    type: "summary",
  });

  await supabase
    .from("section_summaries")
    .upsert(
      { user_id: userId, file_id, section_id, summary_text, key_concepts, updated_at: new Date().toISOString() },
      { onConflict: "user_id,file_id,section_id" },
    );

  return NextResponse.json(payload);
}

