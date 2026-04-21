import "server-only";

import { cache } from "react";

import { effectiveAccountType, syncSupporterRoleInDb, type AccountType } from "@/lib/auth/accountType";
import { getCurrentUser, getServerSupabase } from "@/lib/auth/serverAuth";
import { isSupabaseSchemaMissingError } from "@/lib/supabase/migrationErrors";

export type ProfileForSettings = {
  id: string;
  email: string | null;
  notifications_enabled: boolean;
  created_at: string;
  account_type: AccountType;
};

export const SETTINGS_SETUP_HINT =
  "Supabase is not fully migrated. In the SQL editor, run `supabase/sql/auth_settings_audio.sql` (includes `account_type` on profiles), or run `supabase/sql/profiles_account_type.sql` on an older database.";

/**
 * Per-request cached role + profile for settings routing and pages.
 */
export const getAccountRoleContext = cache(async () => {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null as typeof user,
      role: "user" as AccountType,
      profile: null as ProfileForSettings | null,
      initialSetupError: null as string | null,
    };
  }

  const supabase = await getServerSupabase();

  const { error: upsertErr } = await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("id,email,notifications_enabled,created_at,account_type")
    .eq("id", user.id)
    .maybeSingle();

  let initialSetupError: string | null = null;
  const errMsg = profileErr?.message ?? upsertErr?.message ?? "";
  if ((profileErr && isSupabaseSchemaMissingError(profileErr.message)) || (upsertErr && isSupabaseSchemaMissingError(errMsg))) {
    initialSetupError = SETTINGS_SETUP_HINT;
  }

  const synced = initialSetupError
    ? profileRow
    : await syncSupporterRoleInDb(supabase, user.id, user.email, profileRow);
  const role = effectiveAccountType(synced ?? profileRow, user.email);

  const base = synced ?? profileRow;
  const profile: ProfileForSettings | null = base
    ? {
        id: base.id,
        email: base.email ?? null,
        notifications_enabled: Boolean(base.notifications_enabled),
        created_at: base.created_at ?? "",
        account_type: role,
      }
    : null;

  return { user, role, profile, initialSetupError };
});

export function settingsHrefForRole(role: AccountType) {
  return role === "supporter" ? "/settings/supporter" : "/settings";
}
