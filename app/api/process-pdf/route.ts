import { NextResponse } from "next/server";
import { z } from "zod";

import { putAiCache, getAiCache } from "@/lib/ai/cache";
import { sha256Hex, estimateTokens } from "@/lib/hash";
import { supabaseServer } from "@/lib/supabase/server";
import type { StructureResult } from "@/lib/openai";
import { classifyDocumentType, extractLegalConcepts, generateStructure, type DocumentType, type LegalExtract } from "@/lib/openai";

const BodySchema = z.object({
  file_hash: z.string().min(16),
  chunks: z.array(z.string().min(1)).min(1),
  batch_size: z.number().int().min(3).max(5).default(5),
});

function batchChunks(chunks: string[], size: number) {
  const out: string[][] = [];
  for (let i = 0; i < chunks.length; i += size) out.push(chunks.slice(i, i + size));
  return out;
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = authData.user.id;

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const { file_hash, chunks, batch_size } = parsed.data;

  // Ensure processed_files row exists and fetch its id so we can store a single merged summary in `summaries`.
  const { data: processedRow, error: processedErr } = await supabase
    .from("processed_files")
    .upsert({ user_id: userId, file_hash }, { onConflict: "user_id,file_hash" })
    .select("id,document_type")
    .maybeSingle();
  if (processedErr) return NextResponse.json({ error: processedErr.message }, { status: 500 });
  const fileId = processedRow?.id as string | undefined;
  if (!fileId) return NextResponse.json({ error: "Could not create processed file row." }, { status: 500 });

  // Document type: prefer DB, otherwise classify (cached).
  let documentType = (processedRow as { document_type?: DocumentType | null } | null)?.document_type ?? null;
  if (!documentType) {
    const sample = chunks.slice(0, 4).join("\n\n");
    const typeKey = sha256Hex(`doctype:v1:${userId}:${file_hash}:${sample.slice(0, 2000)}`);
    const cached = await getAiCache(userId, typeKey);
    if (cached) {
      console.log("[pdf] DOC TYPE CACHE HIT", file_hash);
      try {
        const parsed = JSON.parse(cached.output_text) as { document_type?: DocumentType };
        documentType = parsed.document_type ?? "other";
      } catch {
        documentType = "other";
      }
    } else {
      console.log("[pdf] DOC TYPE CACHE MISS", file_hash);
      const dt = await classifyDocumentType(sample);
      documentType = dt;
      await putAiCache({
        userId,
        inputHash: typeKey,
        inputText: sample.slice(0, 2000),
        outputText: JSON.stringify({ document_type: dt }),
        type: "summary",
      });
    }
    await supabase.from("processed_files").update({ document_type: documentType }).eq("id", fileId);
  }

  // File-level cache: if we already processed this file for this user, return the final cached merged result.
  const fileKey = sha256Hex(`file:${userId}:${file_hash}:structure_v2:${documentType}`);
  const fileHit = await getAiCache(userId, fileKey);
  if (fileHit) {
    console.log("[pdf] CACHE HIT (file)", file_hash);
    return NextResponse.json(JSON.parse(fileHit.output_text));
  }
  console.log("[pdf] CACHE MISS (file)", file_hash);

  const batches = batchChunks(chunks, batch_size);
  console.log("[pdf] BATCH SIZE:", batch_size, "batches:", batches.length);

  if (documentType === "legal") {
    const perBatch: LegalExtract[] = [];
    for (let i = 0; i < batches.length; i++) {
      const batchText = batches[i]!.join("\n\n");
      const input = `type=legal_extract\nmodel=gpt-4.1-mini\nv=1\n${batchText}`;
      const inputHash = sha256Hex(`${userId}:${input}`);

      const hit = await getAiCache(userId, inputHash);
      if (hit) {
        console.log("[pdf] CACHE HIT (legal batch)", i + 1, "/", batches.length, "tokens~", estimateTokens(batchText));
        perBatch.push(JSON.parse(hit.output_text) as LegalExtract);
        continue;
      }

      console.log("[pdf] CACHE MISS (legal batch)", i + 1, "/", batches.length, "tokens~", estimateTokens(batchText));
      const extracted = await extractLegalConcepts(batchText);
      perBatch.push(extracted);

      await putAiCache({
        userId,
        inputHash,
        inputText: batchText.slice(0, 8000),
        outputText: JSON.stringify(extracted),
        type: "summary",
      });
    }

    // Merge and cap total volume.
    const defs = new Set<string>();
    const rules = new Set<string>();
    const procs = new Set<string>();
    for (const b of perBatch) {
      (b.definitions ?? []).forEach((x) => defs.add(x.trim()));
      (b.rules ?? []).forEach((x) => rules.add(x.trim()));
      (b.processes ?? []).forEach((x) => procs.add(x.trim()));
    }
    const out: LegalExtract = {
      definitions: Array.from(defs).filter(Boolean).slice(0, 8),
      rules: Array.from(rules).filter(Boolean).slice(0, 8),
      processes: Array.from(procs).filter(Boolean).slice(0, 8),
    };

    const summaryText = [
      out.definitions.length ? `Definitions:\n${out.definitions.map((d) => `- ${d}`).join("\n")}` : "",
      out.rules.length ? `Rules:\n${out.rules.map((r) => `- ${r}`).join("\n")}` : "",
      out.processes.length ? `Processes:\n${out.processes.map((p) => `- ${p}`).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    const payload = { document_type: documentType, definitions: out.definitions, rules: out.rules, processes: out.processes, summary_text: summaryText, file_id: fileId };

    await putAiCache({
      userId,
      inputHash: fileKey,
      inputText: file_hash,
      outputText: JSON.stringify(payload),
      type: "summary",
    });

    const { error: summaryErr } = await supabase
      .from("summaries")
      .upsert({ user_id: userId, file_id: fileId, summary_text: summaryText }, { onConflict: "user_id,file_id" });
    if (summaryErr) return NextResponse.json({ error: summaryErr.message }, { status: 500 });

    return NextResponse.json(payload);
  }

  const perBatch: StructureResult[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batchText = batches[i]!.join("\n\n");
    const input = `type=summary\nmodel=gpt-4.1-mini\nv=2\ndoc=${documentType}\n${batchText}`;
    const inputHash = sha256Hex(`${userId}:${input}`);

    const hit = await getAiCache(userId, inputHash);
    if (hit) {
      console.log("[pdf] CACHE HIT (batch)", i + 1, "/", batches.length, "tokens~", estimateTokens(batchText));
      perBatch.push(JSON.parse(hit.output_text) as StructureResult);
      continue;
    }

    console.log("[pdf] CACHE MISS (batch)", i + 1, "/", batches.length, "tokens~", estimateTokens(batchText));

    // Short prompt, limited output: sections+concepts only.
    const structured = await generateStructure(batchText);
    perBatch.push(structured);

    await putAiCache({
      userId,
      inputHash,
      inputText: batchText.slice(0, 8000),
      outputText: JSON.stringify(structured),
      type: "summary",
    });

    // Checkpointing: cache after each processed batch is already done above.
    // (If the user retries, all previous batches will be cache hits.)

    // We intentionally do NOT retain raw batch text: downstream features must use summaries to control token usage.
  }

  // Merge per-batch structures on the server (same logic as client mergeSections, but avoid importing client types).
  const byTitle = new Map<string, { title: string; summary?: string; concepts: string[] }>();
  for (const r of perBatch) {
    for (const s of r.sections ?? []) {
      const k = s.title.trim().toLowerCase();
      if (!k) continue;
      const prev = byTitle.get(k);
      if (!prev) {
        byTitle.set(k, { title: s.title, summary: s.summary, concepts: (s.concepts ?? []).filter(Boolean) });
      } else {
        prev.summary = prev.summary || s.summary;
        const set = new Set([...(prev.concepts ?? []), ...((s.concepts ?? []) as string[])].map((x) => x.trim()).filter(Boolean));
        prev.concepts = Array.from(set).slice(0, 20);
      }
    }
  }
  const merged: StructureResult = { sections: Array.from(byTitle.values()) };

  // Single merged summary text stored in DB and used for all derived content.
  const summaryText = merged.sections
    .map((s) => {
      const concepts = (s.concepts ?? []).slice(0, 12).map((c) => `- ${c}`).join("\n");
      return [`## ${s.title}`, s.summary ? s.summary.trim() : "", concepts ? `Key concepts:\n${concepts}` : ""]
        .filter(Boolean)
        .join("\n\n");
    })
    .join("\n\n")
    .trim();

  const payload = { structure: merged, summary_text: summaryText, file_id: fileId };

  await putAiCache({
    userId,
    inputHash: fileKey,
    inputText: file_hash,
    outputText: JSON.stringify(payload),
    type: "summary",
  });

  // Persist the merged summary for this file (idempotent).
  const { error: summaryErr } = await supabase
    .from("summaries")
    .upsert({ user_id: userId, file_id: fileId, summary_text: summaryText }, { onConflict: "user_id,file_id" });
  if (summaryErr) return NextResponse.json({ error: summaryErr.message }, { status: 500 });

  return NextResponse.json(payload);
}

