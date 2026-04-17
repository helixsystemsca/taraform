import "server-only";

import { supabaseServer } from "@/lib/supabase/server";

export type AiCacheType = "summary" | "flashcard" | "quiz";

export async function getAiCache(userId: string, inputHash: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("ai_cache")
    .select("id,input_hash,output_text,type,created_at")
    .eq("user_id", userId)
    .eq("input_hash", inputHash)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function putAiCache(args: {
  userId: string;
  inputHash: string;
  inputText: string;
  outputText: string;
  type: AiCacheType;
}) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("ai_cache").insert({
    user_id: args.userId,
    input_hash: args.inputHash,
    input_text: args.inputText,
    output_text: args.outputText,
    type: args.type,
  });
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    // Duplicate inserts are fine in races; unique constraint guarantees correctness.
    throw new Error(error.message);
  }
}

