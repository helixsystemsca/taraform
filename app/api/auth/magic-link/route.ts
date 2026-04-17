import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { supabaseRouteClient } from "@/app/api/auth/_shared";
import { isAllowedEmail } from "@/lib/auth/allowlist";

const BodySchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const { supabase, getResponse } = supabaseRouteClient(req);
  const { email, next } = parsed.data;

  if (!isAllowedEmail(email)) {
    return NextResponse.json({ error: "Access not allowed. This app is private." }, { status: 403 });
  }

  // After the user clicks the email link, Supabase redirects back to your site.
  // We pass the intended destination so the client can route correctly.
  const redirectTo = new URL("/auth/callback", req.nextUrl.origin);
  redirectTo.searchParams.set("next", next || "/home");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo.toString() },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const res = getResponse();
  return NextResponse.json({ ok: true, message: "Magic link sent. Check your email." }, { headers: res.headers });
}

