import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/serverAuth";
import { supabaseServer } from "@/lib/supabase/server";

const BodySchema = z.object({
  password: z.string().min(8).max(72),
});

/**
 * Set or change password for the signed-in user (works after magic-link sign-in).
 * Uses the cookie-bound Supabase client (not the service role) so `updateUser` applies to the session.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password must be between 8 and 72 characters." }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
