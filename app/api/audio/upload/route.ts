import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getServerSupabase } from "@/lib/auth/serverAuth";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const QuerySchema = z.object({
  type: z.enum(["before", "after"]),
});

type AllowedExt = "mp3" | "m4a";

function detectExt(name: string): AllowedExt | null {
  const n = name.toLowerCase().trim();
  if (n.endsWith(".mp3")) return "mp3";
  if (n.endsWith(".m4a")) return "m4a";
  return null;
}

function contentTypeForExt(ext: AllowedExt): string {
  return ext === "m4a" ? "audio/mp4" : "audio/mpeg";
}

function isAllowedAudio(file: File): AllowedExt | null {
  const ext = detectExt(file.name);
  if (!ext) return null;
  const t = (file.type || "").toLowerCase();
  if (!t) return ext; // Some browsers omit it; rely on extension.
  if (ext === "mp3" && (t === "audio/mpeg" || t === "audio/mp3")) return ext;
  if (ext === "m4a" && (t === "audio/mp4" || t === "audio/x-m4a")) return ext;
  return null;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const parsedQuery = QuerySchema.safeParse({ type: url.searchParams.get("type") });
  if (!parsedQuery.success) return NextResponse.json({ error: "Missing or invalid type." }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await getServerSupabase();

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file." }, { status: 400 });

  const ext = isAllowedAudio(file);
  if (!ext) return NextResponse.json({ error: "Only .mp3 or .m4a uploads are allowed." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 10MB)." }, { status: 413 });

  const type = parsedQuery.data.type;
  const userId = user.id;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `${userId}/${type}/${ts}.${ext}`;

  // Upload to private bucket `audio` (RLS policies restrict to the user's own folder).
  const { error: uploadErr } = await supabase.storage.from("audio").upload(path, file, {
    contentType: file.type || contentTypeForExt(ext),
    upsert: true,
  });
  if (uploadErr) {
    const msg = uploadErr.message ?? "";
    if (/bucket not found/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Storage bucket `audio` is missing. Run `supabase/sql/auth_settings_audio.sql` in the Supabase SQL editor (it creates the bucket and policies), or create a private bucket named `audio` under Storage → Buckets.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Store the storage path (in `file_url`) so we can generate signed URLs for playback.
  const { data: inserted, error: dbErr } = await supabase
    .from("user_audio")
    .insert({ user_id: userId, type, file_url: path })
    .select("id")
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: inserted?.id ?? null });
}

