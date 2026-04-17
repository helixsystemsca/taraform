export function getSupabaseEnv() {
  // Prefer non-public vars on the server, but allow NEXT_PUBLIC_* as a fallback.
  // The anon key is not a secret, but using a non-public name keeps env configuration consistent on Vercel.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_ANON_KEY (and optionally NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY for the client).",
    );
  }

  return { url, anon };
}

export function isSupabaseConfigured() {
  return !!(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !!(process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

