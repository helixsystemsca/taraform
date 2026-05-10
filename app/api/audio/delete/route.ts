import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getServerSupabase } from "@/lib/auth/serverAuth";

const BodySchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });

  const supabase = await getServerSupabase();
  const { data: row, error: selErr } = await supabase
    .from("user_audio")
    .select("id,user_id,file_url")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (selErr || !row || row.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const path = row.file_url as string;
  const { error: rmErr } = await supabase.storage.from("audio").remove([path]);
  if (rmErr) {
    return NextResponse.json({ error: rmErr.message ?? "Storage delete failed" }, { status: 500 });
  }

  const { error: delErr } = await supabase.from("user_audio").delete().eq("id", parsed.data.id).eq("user_id", user.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
