import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { jsonWithSupabaseCookies, supabaseRouteClient } from "@/app/api/auth/_shared";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { DEFAULT_POST_LOGIN_PATH } from "@/lib/auth/authCallbackUrl";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const { supabase, getResponse } = supabaseRouteClient(req);
  const { email, password, next } = parsed.data;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return NextResponse.json({ error: error?.message || "Invalid credentials." }, { status: 401 });
  }

  const authedEmail = data.user?.email ?? null;
  if (!isAllowedEmail(authedEmail)) {
    // Immediately clear cookies/session so unauthorized users can't access API routes.
    await supabase.auth.signOut();
    return jsonWithSupabaseCookies(getResponse(), { error: "Access not allowed. This app is private." }, { status: 403 });
  }

  return jsonWithSupabaseCookies(getResponse(), { ok: true, redirectTo: next || DEFAULT_POST_LOGIN_PATH });
}

