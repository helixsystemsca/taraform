import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { jsonWithSupabaseCookies, supabaseRouteClient } from "@/app/api/auth/_shared";
import { isAllowedEmail } from "@/lib/auth/allowlist";

const BodySchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  let auth: ReturnType<typeof supabaseRouteClient> | undefined;
  try {
    auth = supabaseRouteClient(req);
    const { supabase, getResponse } = auth;
    const { email, next } = parsed.data;

    if (!isAllowedEmail(email)) {
      return jsonWithSupabaseCookies(getResponse(), { error: "Access not allowed. This app is private." }, { status: 403 });
    }

    const redirectTo = new URL("/auth/callback", req.nextUrl.origin);
    redirectTo.searchParams.set("next", next || "/home");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo.toString() },
    });

    if (error) {
      return jsonWithSupabaseCookies(getResponse(), { error: error.message }, { status: 400 });
    }

    return jsonWithSupabaseCookies(getResponse(), { ok: true, message: "Magic link sent. Check your email." });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Magic link failed.";
    if (auth) {
      return jsonWithSupabaseCookies(auth.getResponse(), { error: message }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
