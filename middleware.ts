import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

import { isAllowedEmail } from "@/lib/auth/allowlist";
import { buildAbsoluteUrl, withAppBasePath } from "@/lib/auth/authCallbackUrl";
import { DEV_USER, isDevAuthBypass } from "@/lib/auth/devUser";

function getSupabaseEnvFromRequest() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return { url, anon };
}

function isPublicPath(pathname: string) {
  // Public auth pages + static files.
  if (pathname === "/login" || pathname === "/signup") return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico" || pathname === "/favicon.png") return true;
  return false;
}

function isProtectedPath(pathname: string) {
  // Protect the whole app shell and settings.
  if (pathname === "/" || pathname === "/home") return true;
  return (
    pathname === "/settings" ||
    pathname.startsWith("/plan") ||
    pathname.startsWith("/upload") ||
    pathname.startsWith("/study") ||
    pathname.startsWith("/notes") ||
    pathname.startsWith("/review") ||
    pathname.startsWith("/concepts") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/session") ||
    pathname.startsWith("/workspace")
  );
}

export async function middleware(request: NextRequest) {
  const env = getSupabaseEnvFromRequest();
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anon, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: { [key: string]: unknown }) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: { [key: string]: unknown }) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isDevAuthBypass()) {
    user = { id: DEV_USER.id, email: DEV_USER.email } as User;
  }

  if (user && !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(buildAbsoluteUrl(request, "/login", { error: "access_not_allowed" }));
  }

  const { pathname, searchParams } = request.nextUrl;
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const callbackPath = withAppBasePath("/auth/callback");

  // Supabase "Site URL" is often the site root, so email links open `/?code=…` instead of `/auth/callback?code=…`.
  // `/` is protected below; without this, unauthenticated users get sent to /login and the code is lost.
  const hasAuthReturn = !!(searchParams.get("code") || searchParams.get("error"));
  if (hasAuthReturn && !pathname.startsWith(callbackPath)) {
    const isSiteRoot =
      pathname === "/" || pathname === "" || (base !== "" && (pathname === base || pathname === `${base}/`));
    if (isSiteRoot) {
      const url = buildAbsoluteUrl(request, "/auth/callback");
      searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      return NextResponse.redirect(url);
    }
  }

  if (isPublicPath(pathname)) {
    if (user && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(buildAbsoluteUrl(request, "/home"));
    }
    return response;
  }

  if (isProtectedPath(pathname) && !user) {
    return NextResponse.redirect(buildAbsoluteUrl(request, "/login", { next: pathname }));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
