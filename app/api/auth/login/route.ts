import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { supabaseRouteClient } from "@/app/api/auth/_shared";
import { getAllowedEmail } from "@/lib/auth/allowlist";

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

  const allowed = getAllowedEmail();
  const authedEmail = data.user?.email?.trim().toLowerCase() ?? "";
  if (allowed && authedEmail !== allowed) {
    // Immediately clear cookies/session so unauthorized users can't access API routes.
    await supabase.auth.signOut();
    const res = getResponse();
    return NextResponse.json({ error: "Access not allowed. This app is private." }, { status: 403, headers: res.headers });
  }

  const res = getResponse();
  return NextResponse.json({ ok: true, redirectTo: next || "/home" }, { headers: res.headers });
}

