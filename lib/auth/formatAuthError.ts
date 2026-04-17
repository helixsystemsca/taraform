/**
 * Turns Supabase / auth API error strings into short, actionable copy for the UI.
 */
export function formatAuthError(message: string | undefined | null): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Something went wrong. Please try again.";

  const m = raw.toLowerCase();

  if (m.includes("email rate limit") || m.includes("rate limit exceeded") || m.includes("too many requests")) {
    return "Auth email limit reached. Supabase counts every sign-up confirmation, magic link, and resend—not just “new accounts.” Built-in email has a small hourly cap; wait a bit, use password sign-in, or add custom SMTP in Supabase for higher volume.";
  }

  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "That email already has an account. Try signing in instead.";
  }

  if (m.includes("invalid login credentials") || m.includes("invalid email or password")) {
    return "Invalid email or password.";
  }

  return raw;
}
