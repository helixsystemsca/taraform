import type { SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseSchemaMissingError } from "@/lib/supabase/migrationErrors";

export type ProfileRow = {
  id: string;
  email: string | null;
  notifications_enabled: boolean;
  created_at: string;
  account_type?: string | null;
};

/**
 * Reads `profiles` including `account_type`. If the column is not migrated yet, falls back to a legacy select.
 */
export async function selectProfileRow(supabase: SupabaseClient, userId: string) {
  let { data, error } = await supabase
    .from("profiles")
    .select("id,email,notifications_enabled,created_at,account_type")
    .eq("id", userId)
    .maybeSingle();

  if (error && /account_type/i.test(error.message) && isSupabaseSchemaMissingError(error.message)) {
    const legacy = await supabase
      .from("profiles")
      .select("id,email,notifications_enabled,created_at")
      .eq("id", userId)
      .maybeSingle();
    if (!legacy.error) {
      data = legacy.data as typeof data;
      error = null;
    }
  }

  return { data, error } as const;
}
