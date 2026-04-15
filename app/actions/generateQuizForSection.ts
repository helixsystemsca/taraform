"use server";

import { generateObject } from "ai";

import { taraformModel } from "@/lib/ai/openai";
import { QuizSchema } from "@/lib/ai/schemas";

const SYSTEM_GUARDRAILS = [
  "You create NCLEX-style questions ONLY from the provided source text.",
  "NEVER invent or hallucinate details. If the source does not support a question, do not ask it.",
  "Prefer wording that quotes or closely paraphrases the source.",
  "After drafting, run a self-check: 'Is every factual claim directly supported by the source text?' If not, remove or revise.",
].join("\n");

export async function generateQuizForSection(input: {
  sectionTitle: string;
  extractedText: string;
  keyConcepts: string[];
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Add it to .env.local.");
  }

  const { object } = await generateObject({
    model: taraformModel(),
    temperature: 0,
    topP: 0.1,
    schema: QuizSchema,
    system: SYSTEM_GUARDRAILS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Create 8–12 NCLEX-style questions based ONLY on the source below.\n\n` +
              `SECTION TITLE: ${input.sectionTitle}\n` +
              `KEY CONCEPTS: ${input.keyConcepts.join(", ")}\n\n` +
              `SOURCE TEXT START\n${input.extractedText}\nSOURCE TEXT END\n\n` +
              `Constraints:\n` +
              `- Include a mix of multiple_choice, select_all, and at least 1 case_study.\n` +
              `- Choices must be plausible and non-overlapping.\n` +
              `- Rationales must reference the source text (no external guidelines).\n`,
          },
        ],
      },
    ],
  });

  // Minimal deterministic sanity checks (bounds + indices) after schema validation.
  const cleaned = {
    questions: object.questions.map((q) => {
      if (q.type === "multiple_choice" || q.type === "case_study") {
        const max = q.choices.length - 1;
        return { ...q, correctIndex: Math.max(0, Math.min(max, q.correctIndex)) };
      }
      const max = q.choices.length - 1;
      const uniq = Array.from(new Set(q.correctIndices)).filter((i) => i >= 0 && i <= max);
      return { ...q, correctIndices: uniq.length ? uniq : [0] };
    }),
  };

  return cleaned;
}

