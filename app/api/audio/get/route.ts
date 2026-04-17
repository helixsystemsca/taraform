import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";

type AudioType = "before" | "after";

async function getLatestPath(supabase: Awaited<ReturnType<typeof supabaseServer>>, userId: string, type: AudioType) {
  const { data, error } = await supabase
    .from("user_audio")
    .select("file_url,created_at")
    .eq("user_id", userId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.file_url ?? null;
}

export async function GET() {
  const supabase = await supabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = authData.user.id;

  try {
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
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load audio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

