"use client";

import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Browser Supabase client.
 *
 * IMPORTANT: uses cookie-based auth (via `@supabase/ssr`) so Next.js middleware and server code
 * can read the signed-in session. This keeps route protection + server actions consistent.
 *
 * (The anon key is public; authorization is enforced by RLS + the user's JWT.)
 */
export function supabaseBrowser() {
  // In the browser we prefer a safe fallback to avoid hard-crashing the app if env vars are missing.
  if (!isSupabaseConfigured()) return null;
  // In the browser, only NEXT_PUBLIC_* vars are available at runtime.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  // Cookie-based client (writes Supabase auth cookies that middleware/server can read).
  return createBrowserClient(url, anon);
}

