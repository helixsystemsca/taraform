import { NextResponse, type NextRequest } from "next/server";

import { supabaseRouteClient } from "@/app/api/auth/_shared";
import { isAllowedEmail } from "@/lib/auth/allowlist";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") || "/home";

  if (!code) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  const { supabase, getResponse } = supabaseRouteClient(req);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", next);
    url.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(url);
  }

  const { data } = await supabase.auth.getUser();
  if (!isAllowedEmail(data.user?.email ?? null)) {
    await supabase.auth.signOut();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "access_not_allowed");
    return NextResponse.redirect(url, { headers: getResponse().headers });
  }

  const res = getResponse();
  const url = req.nextUrl.clone();
  url.pathname = next;
  url.search = "";
  return NextResponse.redirect(url, { headers: res.headers });
}

