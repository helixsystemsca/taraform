"use server";

import { generateObject } from "ai";

import { taraformTextModel } from "@/lib/ai/openai";
import { QuizSchema } from "@/lib/ai/schemas";
import type { QuizObject } from "@/lib/ai/schemas";
import { estimateTokens } from "@/lib/hash";
import { supabaseServer } from "@/lib/supabase/server";

const SYSTEM_GUARDRAILS = [
  "You create NCLEX-style questions ONLY from the provided source text.",
  "NEVER invent or hallucinate details. If the source does not support a question, do not ask it.",
  "Prefer wording that quotes or closely paraphrases the source.",
  "After drafting, run a self-check: 'Is every factual claim directly supported by the source text?' If not, remove or revise.",
].join("\n");

export async function generateQuizForSection(input: {
  /** Stable client section id (Zustand); used as DB key so we never re-call OpenAI for the same section. */
  sectionId: string;
  sectionTitle: string;
  extractedText: string;
  keyConcepts: string[];
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Add it to .env.local.");
  }

  const supabase = await supabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? null;

  const source = input.extractedText.trim().slice(0, 8000);

  // 1) DB: one quiz row per user + section — no OpenAI if already stored.
  if (userId && input.sectionId) {
    const { data: row, error: fetchErr } = await supabase
      .from("section_quizzes")
      .select("quiz_json")
      .eq("user_id", userId)
      .eq("section_id", input.sectionId)
      .maybeSingle();

    if (fetchErr) {
      console.error("[quiz] section_quizzes read error", fetchErr.message);
    } else if (row?.quiz_json) {
      console.log("QUIZ CACHE HIT", { sectionId: input.sectionId });
      return row.quiz_json as QuizObject;
    }
    console.log("QUIZ CACHE MISS", { sectionId: input.sectionId, tokensEstimate: estimateTokens(source) });
  } else {
    console.log("QUIZ CACHE MISS", {
      reason: "no_session_or_section_id",
      tokensEstimate: estimateTokens(source),
    });
  }

  const { object } = await generateObject({
    model: taraformTextModel(),
    temperature: 0,
    topP: 0.1,
    maxOutputTokens: 300,
    schema: QuizSchema,
    system: SYSTEM_GUARDRAILS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Create a concise quiz from the source.\n" +
              "Return JSON matching the provided schema.\n\n" +
              `SECTION: ${input.sectionTitle}\n` +
              `CONCEPTS: ${input.keyConcepts.slice(0, 12).join(", ")}\n\n` +
              `SOURCE:\n${source}\n`,
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

  if (userId && input.sectionId) {
    const { error: upsertErr } = await supabase.from("section_quizzes").upsert(
      {
        user_id: userId,
        section_id: input.sectionId,
        quiz_json: cleaned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,section_id" },
    );
    if (upsertErr) {
      console.error("[quiz] section_quizzes save error", upsertErr.message);
    }
  }

  return cleaned;
}

