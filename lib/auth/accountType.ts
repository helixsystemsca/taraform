import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isSupporterEmailFromEnv } from "@/lib/auth/supporterEmails";

export type AccountType = "user" | "supporter";

type ProfileRow = {
  id?: string;
  email?: string | null;
  notifications_enabled?: boolean;
  created_at?: string;
  account_type?: string | null;
} | null;

export function effectiveAccountType(profile: ProfileRow, email: string | null | undefined): AccountType {
  if (profile?.account_type === "supporter") return "supporter";
  if (isSupporterEmailFromEnv(email)) return "supporter";
  return "user";
}

/**
 * If the email is in `TARAFORM_SUPPORTER_EMAILS`, upsert `account_type = supporter`.
 */
export async function syncSupporterRoleInDb(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
  profile: ProfileRow,
): Promise<ProfileRow> {
  if (!isSupporterEmailFromEnv(email)) return profile;
  const em = (email ?? profile?.email ?? "").trim();
  const { error } = await supabase.from("profiles").upsert(
    { id: userId, email: em || undefined, account_type: "supporter" },
    { onConflict: "id" },
  );
  if (error) return profile;
  const nextEmail = em || profile?.email || null;
  return { ...profile, id: userId, email: nextEmail, account_type: "supporter" };
}
