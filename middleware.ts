import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";

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
    pathname.startsWith("/session")
  );
}

export async function middleware(request: NextRequest) {
  const env = getSupabaseEnvFromRequest();
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });

  // Keep the user's session fresh in middleware, so server code can read it from cookies.
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    // If already authed, don't show login/signup again.
    if (user && (pathname === "/login" || pathname === "/signup")) {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (isProtectedPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - static files in /public
     * - Next.js internals
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

