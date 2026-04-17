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

  if (m === "otp_expired" || m.includes("otp_expired") || m.includes("email link is invalid") || m.includes("link is invalid")) {
    return "That sign-in link expired or was already used. Request a new magic link from the login page.";
  }

  if (m === "missing_code" || m.includes("missing_code")) {
    return "Sign-in link was incomplete. Request a new magic link and open it in this same browser.";
  }

  if (m === "auth_callback_failed" || m.includes("auth_callback_failed")) {
    return "Could not complete sign-in. Try a new magic link, or use password sign-in.";
  }

  if (m === "auth_provider_error" || m.includes("auth_provider_error")) {
    return "Sign-in was cancelled or failed. Try again.";
  }

  if (m === "access_denied" || m.includes("access_denied")) {
    return "Sign-in was denied. Try again.";
  }

  return raw;
}
