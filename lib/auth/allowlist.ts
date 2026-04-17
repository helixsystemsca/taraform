import "server-only";

/**
 * Single-user allowlist.
 *
 * This prevents signups/logins for anyone except the allowed email, and is also used
 * by protected API routes to block unauthorized API usage.
 */
export function getAllowedEmail() {
  const raw = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  return raw || null;
}

export function isAllowedEmail(email: string | null | undefined) {
  const allowed = getAllowedEmail();
  if (!allowed) return true; // If unset, do not block (safer for dev until configured).
  return (email ?? "").trim().toLowerCase() === allowed;
}

