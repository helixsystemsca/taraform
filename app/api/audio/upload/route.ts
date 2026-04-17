import { NextResponse } from "next/server";
import { z } from "zod";

import { supabaseServer } from "@/lib/supabase/server";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const QuerySchema = z.object({
  type: z.enum(["before", "after"]),
});

function isMp3(file: File) {
  const nameOk = file.name.toLowerCase().endsWith(".mp3");
  const typeOk = file.type === "audio/mpeg" || file.type === "audio/mp3" || file.type === "";
  return nameOk && typeOk;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const parsedQuery = QuerySchema.safeParse({ type: url.searchParams.get("type") });
  if (!parsedQuery.success) return NextResponse.json({ error: "Missing or invalid type." }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file." }, { status: 400 });

  if (!isMp3(file)) return NextResponse.json({ error: "Only .mp3 uploads are allowed." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 10MB)." }, { status: 413 });

  const type = parsedQuery.data.type;
  const userId = authData.user.id;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `${userId}/${type}/${ts}.mp3`;

  // Upload to private bucket `audio` (RLS policies restrict to the user's own folder).
  const { error: uploadErr } = await supabase.storage.from("audio").upload(path, file, {
    contentType: "audio/mpeg",
    upsert: true,
  });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  // Store the storage path (in `file_url`) so we can generate signed URLs for playback.
  const { error: dbErr } = await supabase.from("user_audio").insert({ user_id: userId, type, file_url: path });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

