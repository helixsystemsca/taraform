import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getServerSupabase } from "@/lib/auth/serverAuth";

const UpdateSchema = z.object({
  notifications_enabled: z.boolean(),
});

async function getUserOr401() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const supabase = await getServerSupabase();
  return { supabase, user } as const;
}

export async function GET() {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;

  // Ensure a profile exists even if the database trigger wasn't installed yet.
  await auth.supabase
    .from("profiles")
    .upsert({ id: auth.user.id, email: auth.user.email }, { onConflict: "id" });

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id,email,notifications_enabled,created_at")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function POST(req: Request) {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;

  const json = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const { error } = await auth.supabase
    .from("profiles")
    .update({ notifications_enabled: parsed.data.notifications_enabled })
    .eq("id", auth.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

