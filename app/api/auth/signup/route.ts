import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { supabaseRouteClient } from "@/app/api/auth/_shared";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  next: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const { supabase, getResponse } = supabaseRouteClient(req);
  const { email, password, next } = parsed.data;

  const redirectTo = new URL("/auth/callback", req.nextUrl.origin);
  redirectTo.searchParams.set("next", next || "/home");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo.toString() },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // If email confirmations are enabled, there might not be a session yet.
  const needsEmailConfirm = !data.session;

  const res = getResponse();
  return NextResponse.json(
    needsEmailConfirm
      ? { ok: true, needsEmailConfirm: true, message: "Check your email to confirm your account." }
      : { ok: true, redirectTo: next || "/home" },
    { headers: res.headers },
  );
}

