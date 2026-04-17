import { NextResponse, type NextRequest } from "next/server";

import { redirectWithSupabaseCookies, supabaseRouteClient } from "@/app/api/auth/_shared";
import { withAppBasePath } from "@/lib/auth/authCallbackUrl";
import { isAllowedEmail } from "@/lib/auth/allowlist";

function loginWithError(req: NextRequest, next: string, errorCode: string) {
  const url = req.nextUrl.clone();
  url.pathname = withAppBasePath("/login");
  url.search = "";
  url.searchParams.set("next", next.startsWith("/") ? next : `/${next}`);
  url.searchParams.set("error", errorCode);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") || "/home";
  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  console.log("[auth/callback] request", {
    hasCode: !!code,
    oauthError: oauthError ?? null,
    next,
    origin: req.nextUrl.origin,
  });

  if (oauthError) {
    console.warn("[auth/callback] provider returned error", { oauthError, errorDescription });
    const desc = (errorDescription ?? "").toLowerCase();
    const codeParam =
      oauthError === "access_denied"
        ? "access_denied"
        : desc.includes("otp") || desc.includes("expired") || desc.includes("invalid")
          ? "otp_expired"
          : "auth_provider_error";
    return loginWithError(req, next, codeParam);
  }

  if (!code) {
    console.warn("[auth/callback] missing ?code= — user may have opened an old link or the redirect URL mismatched Supabase config");
    return loginWithError(req, next, "missing_code");
  }

  const { supabase, getResponse } = supabaseRouteClient(req);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.warn("[auth/callback] exchangeCodeForSession failed", { message: error.message, name: error.name });
    const msg = error.message.toLowerCase();
    const errParam =
      msg.includes("otp") || msg.includes("expired") || msg.includes("flow_state") || msg.includes("pkce")
        ? "otp_expired"
        : "auth_callback_failed";
    const url = req.nextUrl.clone();
    url.pathname = withAppBasePath("/login");
    url.search = "";
    url.searchParams.set("next", next.startsWith("/") ? next : `/${next}`);
    url.searchParams.set("error", errParam);
    return redirectWithSupabaseCookies(getResponse(), url);
  }

  const { data } = await supabase.auth.getUser();
  console.log("[auth/callback] session created", { userId: data.user?.id ?? null, email: data.user?.email ?? null });

  if (!isAllowedEmail(data.user?.email ?? null)) {
    await supabase.auth.signOut();
    const url = req.nextUrl.clone();
    url.pathname = withAppBasePath("/login");
    url.search = "";
    url.searchParams.set("error", "access_not_allowed");
    url.searchParams.set("next", next.startsWith("/") ? next : `/${next}`);
    return redirectWithSupabaseCookies(getResponse(), url);
  }

  const url = req.nextUrl.clone();
  url.pathname = withAppBasePath(next.startsWith("/") ? next : `/${next}`);
  url.search = "";
  console.log("[auth/callback] redirecting to app", { pathname: url.pathname });
  return redirectWithSupabaseCookies(getResponse(), url);
}
