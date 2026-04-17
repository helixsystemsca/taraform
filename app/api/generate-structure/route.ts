import { NextResponse } from "next/server";
import { z } from "zod";

import { generateStructure } from "@/lib/openai";

const BodySchema = z.object({
  content: z.string().min(1),
});

export async function POST(req: Request) {
  // Fail fast with 400 (same as other AI routes) instead of 500 from deep `getApiKey()` throws.
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 400 });
  }
  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body. Expected { content: string }." }, { status: 400 });
    }
    const result = await generateStructure(parsed.data.content);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
