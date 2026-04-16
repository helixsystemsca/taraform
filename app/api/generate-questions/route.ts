import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { taraformModel } from "@/lib/ai/openai";
import { GenerateQuestionSchema } from "@/lib/srs/schemas";

const BodySchema = z.object({
  concept: z.string().min(3),
  section_title: z.string().min(1),
  extracted_text: z.string().min(1),
});

const SYSTEM = [
  "You write a single multiple-choice question ONLY using the provided source text.",
  "Do not use outside facts. Do not hallucinate.",
  "Make choices plausible and non-overlapping.",
  "Explain the correct choice by quoting or closely paraphrasing the source.",
].join("\n");

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 400 });
  }
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const input = parsed.data;
  const { object } = await generateObject({
    model: taraformModel(),
    temperature: 0,
    topP: 0.2,
    schema: GenerateQuestionSchema,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Create 1 multiple-choice question to test this concept:\n` +
              `CONCEPT: ${input.concept}\n` +
              `SECTION: ${input.section_title}\n\n` +
              `SOURCE START\n${input.extracted_text}\nSOURCE END\n`,
          },
        ],
      },
    ],
  });

  return NextResponse.json({ question: object });
}

