import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function getEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_ANON_KEY (and NEXT_PUBLIC_* for the browser).");
  }
  return { url, anon };
}

/**
 * Copies cookies from the intermediate Supabase response onto the final handler response.
 * Never pass `from.headers` into `NextResponse.json` / `redirect` — multiple `Set-Cookie`
 * values are not preserved correctly that way and can break PKCE / magic-link flows.
 */
export function copySupabaseCookiesOnto(from: NextResponse, onto: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    onto.cookies.set(cookie);
  }
}

/**
 * Creates a Supabase server client for Route Handlers that can set auth cookies on the response.
 * Uses the same getAll/setAll pattern as Supabase's Next.js middleware docs so PKCE cookies
 * from signInWithOtp / exchangeCodeForSession are written reliably.
 */
export function supabaseRouteClient(req: NextRequest) {
  const { url, anon } = getEnv();
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet, responseHeaders) {
        cookiesToSet.forEach(({ name, value }) => {
          if (value) req.cookies.set(name, value);
          else req.cookies.delete(name);
        });
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => {
          if (value) {
            res.cookies.set(name, value, options as CookieOptions | undefined);
          } else {
            res.cookies.set({ name, value: "", ...(options as CookieOptions | undefined), maxAge: 0 });
          }
        });
        if (responseHeaders && typeof responseHeaders === "object") {
          for (const [key, value] of Object.entries(responseHeaders)) {
            if (typeof value === "string") res.headers.set(key, value);
          }
        }
      },
    },
  });

  return { supabase, getResponse: () => res };
}

export function jsonWithSupabaseCookies(from: NextResponse, body: unknown, init?: ResponseInit) {
  const out = NextResponse.json(body, init);
  copySupabaseCookiesOnto(from, out);
  return out;
}

export function redirectWithSupabaseCookies(from: NextResponse, url: URL | string) {
  const out = NextResponse.redirect(url);
  copySupabaseCookiesOnto(from, out);
  return out;
}
