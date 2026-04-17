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
 * Creates a Supabase server client for Route Handlers that can set auth cookies on the response.
 * This is why login/signup are implemented as API routes instead of calling Supabase Auth directly in the browser.
 */
export function supabaseRouteClient(req: NextRequest) {
  const { url, anon } = getEnv();
  const res = NextResponse.next();

  const supabase = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  return { supabase, getResponse: () => res };
}

