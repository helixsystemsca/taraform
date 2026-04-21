import "server-only";

/**
 * Comma-separated emails that should be treated as **supporter** accounts (encouragement tools).
 * Stored in `profiles.account_type` on sync (see `syncSupporterRoleInDb`).
 */
export function getSupporterEmailsFromEnv() {
  const raw = process.env.TARAFORM_SUPPORTER_EMAILS ?? process.env.SUPPORTER_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSupporterEmailFromEnv(email: string | null | undefined) {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  return getSupporterEmailsFromEnv().includes(e);
}
