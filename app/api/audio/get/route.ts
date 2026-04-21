import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCurrentUser, getServerSupabase } from "@/lib/auth/serverAuth";

type AudioType = "before" | "after";

async function getLatestPath(supabase: SupabaseClient, userId: string, type: AudioType) {
  const { data, error } = await supabase
    .from("user_audio")
    .select("file_url,created_at")
    .eq("user_id", userId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.file_url ?? null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await getServerSupabase();
  const userId = user.id;

  const beforePath = await getLatestPath(supabase, userId, "before");
  const afterPath = await getLatestPath(supabase, userId, "after");

  const expiresIn = 60 * 60; // 1 hour

  async function sign(path: string | null) {
    if (!path) return null;
    const { data, error } = await supabase.storage.from("audio").createSignedUrl(path, expiresIn);
    if (error) return null;
    return data.signedUrl;
  }

  const [beforeUrl, afterUrl] = await Promise.all([sign(beforePath), sign(afterPath)]);

  return NextResponse.json({
    before: beforeUrl ? { url: beforeUrl } : null,
    after: afterUrl ? { url: afterUrl } : null,
  });
}

