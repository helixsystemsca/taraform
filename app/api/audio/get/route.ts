import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCurrentUser, getServerSupabase } from "@/lib/auth/serverAuth";

type AudioType = "before" | "after";

async function listPaths(supabase: SupabaseClient, userId: string, type: AudioType): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_audio")
    .select("file_url")
    .eq("user_id", userId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error || !data?.length) return [];
  return data.map((r) => r.file_url).filter((p): p is string => typeof p === "string" && p.length > 0);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await getServerSupabase();
  const userId = user.id;

  const [beforePaths, afterPaths] = await Promise.all([
    listPaths(supabase, userId, "before"),
    listPaths(supabase, userId, "after"),
  ]);

  const expiresIn = 60 * 60; // 1 hour

  async function signAll(paths: string[]): Promise<string[]> {
    const results = await Promise.all(
      paths.map(async (path) => {
        const { data, error } = await supabase.storage.from("audio").createSignedUrl(path, expiresIn);
        if (error || !data?.signedUrl) return null;
        return data.signedUrl;
      }),
    );
    return results.filter((u): u is string => typeof u === "string");
  }

  const [beforeUrls, afterUrls] = await Promise.all([signAll(beforePaths), signAll(afterPaths)]);

  return NextResponse.json({
    beforeUrls,
    afterUrls,
  });
}
