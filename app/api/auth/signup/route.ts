import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { jsonWithSupabaseCookies, supabaseRouteClient } from "@/app/api/auth/_shared";
import { buildAuthEmailRedirectUrl } from "@/lib/auth/authCallbackUrl";
import { isAllowedEmail } from "@/lib/auth/allowlist";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
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
    const { email, password, next } = parsed.data;

    if (!isAllowedEmail(email)) {
      return jsonWithSupabaseCookies(getResponse(), { error: "Access not allowed. This app is private." }, { status: 403 });
    }

    const emailRedirectTo = buildAuthEmailRedirectUrl(req, next);
    console.log("[auth] signup: email redirect URL", { emailRedirectTo, nodeEnv: process.env.NODE_ENV });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });

    console.log("[auth] signup result", { ok: !error, hasSession: !!data?.session, hasUser: !!data?.user });

    if (error) {
      return jsonWithSupabaseCookies(getResponse(), { error: error.message }, { status: 400 });
    }

    const needsEmailConfirm = !data.session;

    return jsonWithSupabaseCookies(
      getResponse(),
      needsEmailConfirm
        ? { ok: true, needsEmailConfirm: true, message: "Check your email to confirm your account." }
        : { ok: true, redirectTo: next || "/home" },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Signup failed.";
    if (auth) {
      return jsonWithSupabaseCookies(auth.getResponse(), { error: message }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
