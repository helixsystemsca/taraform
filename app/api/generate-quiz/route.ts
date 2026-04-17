import { NextResponse } from "next/server";
import { z } from "zod";

import { generateQuiz } from "@/lib/openai";

const BodySchema = z.object({
  content: z.string().min(1),
});

export async function POST(req: Request) {
  // Match other AI routes: missing key is a config error (400), not an uncaught 500.
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 400 });
  }
  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body. Expected { content: string }." }, { status: 400 });
    }
    const result = await generateQuiz(parsed.data.content);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
