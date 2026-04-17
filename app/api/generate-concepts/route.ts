import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { taraformTextModel } from "@/lib/ai/openai";
import { GenerateConceptsSchema } from "@/lib/srs/schemas";
import { supabaseServer } from "@/lib/supabase/server";

const BodySchema = z.object({
  device_id: z.string().min(6),
  section_id: z.string().min(1),
  section_title: z.string().min(1),
  extracted_text: z.string().min(1),
});

const SYSTEM = [
  "You extract study concepts ONLY from the provided source text.",
  "Do not hallucinate. If the source is thin, return fewer concepts.",
  "Return short, atomic concepts (3–12 words).",
].join("\n");

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 400 });
  }
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const input = parsed.data;
  let object: z.infer<typeof GenerateConceptsSchema>;
  try {
    const result = await generateObject({
      model: taraformTextModel(),
      temperature: 0,
      topP: 0.1,
      maxOutputTokens: 300,
      schema: GenerateConceptsSchema,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Extract 6–14 key concepts for spaced repetition from the source below.\n` +
                `SECTION: ${input.section_title}\n\n` +
                `SOURCE START\n${input.extracted_text}\nSOURCE END\n`,
            },
          ],
        },
      ],
    });
    object = result.object;
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenAI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const nowIso = new Date().toISOString();
  const rows = object.concepts.slice(0, 20).map((c) => ({
    device_id: input.device_id,
    section_id: input.section_id,
    concept: c,
    strength: 0.35,
    stability: 1.0,
    last_reviewed: null,
    next_review: nowIso,
  }));

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("concepts")
    .upsert(rows, { onConflict: "device_id,section_id,concept" })
    .select("id,device_id,section_id,concept,strength,stability,last_reviewed,next_review,created_at,updated_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ concepts: data ?? [] });
}

