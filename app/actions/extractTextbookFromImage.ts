"use server";

import { generateObject, generateText } from "ai";

import { taraformModel } from "@/lib/ai/openai";
import { TextbookExtractionSchema } from "@/lib/ai/schemas";

const SYSTEM_GUARDRAILS = [
  "You are an extremely accurate textbook OCR and chapter detector. ONLY extract text that is clearly visible in the image. NEVER invent or hallucinate content. If text is blurry or unreadable, mark it as ‘[illegible]’. Ground every single word in the visual data. After extraction, run a self-critique step: ‘Is every sentence directly traceable to the image?’ If not, remove it.",
  "Return content conservatively. If you are unsure, prefer '[illegible]' or omission.",
].join("\n");

function normalize(s: string) {
  return s
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .trim()
    .toLowerCase();
}

function splitSentences(text: string) {
  const raw = text
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return [];
  // Simple, conservative sentence splitting.
  return raw.split(/(?<=[.?!])\s+(?=[A-Z0-9[\]])/g).map((s) => s.trim()).filter(Boolean);
}

function validateExtractedTextAgainstRaw(extractedText: string, rawVisionText: string) {
  const rawNorm = normalize(rawVisionText);
  const sentences = splitSentences(extractedText);
  const kept: string[] = [];
  for (const sentence of sentences) {
    const sNorm = normalize(sentence);
    if (!sNorm) continue;
    if (rawNorm.includes(sNorm)) kept.push(sentence);
  }
  return kept.join(" ");
}

export async function extractTextbookFromImage(formData: FormData) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Add it to .env.local.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Missing image file.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const mediaType = file.type || "image/jpeg";

  // Pass 1: ultra-conservative raw transcription for grounding.
  const raw = await generateText({
    model: taraformModel(),
    temperature: 0,
    topP: 0.1,
    system: SYSTEM_GUARDRAILS,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Transcribe the visible textbook text verbatim. Do not summarize. Keep headings and line breaks where possible. Use [illegible] for anything unclear." },
          { type: "image", image: arrayBuffer, mediaType },
        ],
      },
    ],
  });

  // Pass 2: structured extraction constrained to the raw transcription.
  const { object } = await generateObject({
    model: taraformModel(),
    temperature: 0,
    topP: 0.1,
    // The AI SDK uses structured outputs when supported; schema enforces the exact shape.
    schema: TextbookExtractionSchema,
    system: SYSTEM_GUARDRAILS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Using ONLY the following raw transcription (no extra content), infer the most likely title, chapter number/title, and section groupings.\n\nRAW TRANSCRIPTION START\n" +
              raw.text +
              "\nRAW TRANSCRIPTION END\n\nRules:\n- Do not add any words that are not present in RAW TRANSCRIPTION.\n- If a section title is unclear, set it to '[illegible]'.\n- extractedText must be verbatim from RAW TRANSCRIPTION (you may remove content, never add).\n- keyConcepts must be words/phrases that appear in extractedText.\n- pageNumberEstimate can be best-effort numeric guess; if unknown set 0.",
          },
        ],
      },
    ],
  });

  // Lightweight, deterministic validation pass: drop any sentence not found in raw transcription.
  const chapters = object.chapters.map((ch) => ({
    ...ch,
    sections: ch.sections.map((s) => ({
      ...s,
      extractedText: validateExtractedTextAgainstRaw(s.extractedText, raw.text),
      keyConcepts: (s.keyConcepts ?? []).filter((k) =>
        normalize(validateExtractedTextAgainstRaw(k, raw.text)).length > 0 &&
        normalize(validateExtractedTextAgainstRaw(s.extractedText, raw.text)).includes(normalize(k)),
      ),
    })),
  }));

  return {
    rawVisionText: raw.text,
    doc: { ...object, chapters },
  };
}

