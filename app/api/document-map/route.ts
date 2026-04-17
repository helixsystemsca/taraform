import { NextResponse } from "next/server";
import { z } from "zod";

import { getAiCache, putAiCache } from "@/lib/ai/cache";
import { sha256Hex } from "@/lib/hash";
import { supabaseServer } from "@/lib/supabase/server";
import { classifyDocumentType, generateDocumentMap, type DocumentMap, type DocumentType } from "@/lib/openai";

const BodySchema = z.object({
  file_hash: z.string().min(16),
  sample_text: z.string().min(200),
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

  const { file_hash, sample_text } = parsed.data;

  const { data: processedRow, error: processedErr } = await supabase
    .from("processed_files")
    .upsert({ user_id: userId, file_hash }, { onConflict: "user_id,file_hash" })
    .select("id,document_type")
    .maybeSingle();
  if (processedErr) return NextResponse.json({ error: processedErr.message }, { status: 500 });
  const fileId = processedRow?.id as string | undefined;
  if (!fileId) return NextResponse.json({ error: "Could not create processed file row." }, { status: 500 });

  // 1) Document type (cached)
  let documentType = (processedRow as { document_type?: DocumentType | null } | null)?.document_type ?? null;
  if (!documentType) {
    const typeKey = sha256Hex(`doctype:v2:${userId}:${file_hash}:${sample_text.slice(0, 2000)}`);
    const cached = await getAiCache(userId, typeKey);
    if (cached) {
      console.log("[map] DOC TYPE CACHE HIT", file_hash);
      try {
        const parsedType = JSON.parse(cached.output_text) as { document_type?: DocumentType };
        documentType = parsedType.document_type ?? "other";
      } catch {
        documentType = "other";
      }
    } else {
      console.log("[map] DOC TYPE CACHE MISS", file_hash);
      const dt = await classifyDocumentType(sample_text);
      documentType = dt;
      await putAiCache({
        userId,
        inputHash: typeKey,
        inputText: sample_text.slice(0, 2000),
        outputText: JSON.stringify({ document_type: dt }),
        type: "summary",
      });
    }
    await supabase.from("processed_files").update({ document_type: documentType }).eq("id", fileId);
  }

  // 2) Document map (cached + stored)
  const mapKey = sha256Hex(`docmap:v1:${userId}:${file_hash}:${documentType}:${sample_text.slice(0, 2000)}`);
  const hit = await getAiCache(userId, mapKey);
  if (hit) {
    console.log("[map] CACHE HIT", file_hash);
    const payload = JSON.parse(hit.output_text) as { file_id: string; document_type: DocumentType; document_map: DocumentMap };
    return NextResponse.json(payload);
  }
  console.log("[map] CACHE MISS", file_hash);

  const documentMap = await generateDocumentMap(sample_text);
  const payload = { file_id: fileId, document_type: documentType, document_map: documentMap };

  await putAiCache({
    userId,
    inputHash: mapKey,
    inputText: sample_text.slice(0, 8000),
    outputText: JSON.stringify(payload),
    type: "summary",
  });

  const { error: saveErr } = await supabase
    .from("document_maps")
    .upsert({ user_id: userId, file_id: fileId, document_map: documentMap }, { onConflict: "user_id,file_id" });
  if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 });

  return NextResponse.json(payload);
}

