import "server-only";

/**
 * Email allowlist for a private app.
 *
 * This prevents signups/logins for anyone except allowed emails, and is also used
 * by protected API routes to block unauthorized API usage.
 */
export function getAllowedEmails() {
  const raw =
    process.env.ALLOWED_EMAILS ??
    process.env.ALLOWED_EMAIL; // back-compat for older single-email config
  const list = (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : null;
}

export function isAllowedEmail(email: string | null | undefined) {
  const allowed = getAllowedEmails();
  if (!allowed) return true; // If unset, do not block (safer for dev until configured).
  const e = (email ?? "").trim().toLowerCase();
  return allowed.includes(e);
}

