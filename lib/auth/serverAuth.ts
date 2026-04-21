import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import type { AccountType } from "@/lib/auth/accountType";
import { DEV_USER, isDevAuthBypass } from "@/lib/auth/devUser";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  /**
   * From Supabase Auth `app_metadata` / `user_metadata` key `taraform_account_type`
   * (`"supporter"` | `"user"`). Useful before `profiles.account_type` exists.
   */
  authAccountType?: AccountType;
};

function accountTypeFromAuthUser(user: User): AccountType | undefined {
  const app = user.app_metadata as Record<string, unknown> | undefined;
  const um = user.user_metadata as Record<string, unknown> | undefined;
  const raw = app?.taraform_account_type ?? um?.taraform_account_type;
  if (raw === "supporter" || raw === "user") return raw;
  return undefined;
}

/**
 * Current actor for server code and middleware-aligned checks.
 * In development: always returns {@link DEV_USER} (no Supabase session required).
 * In production: reads the session from Supabase Auth cookies.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isDevAuthBypass()) {
    return { id: DEV_USER.id, email: DEV_USER.email };
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id || !data.user.email) return null;
  const authAccountType = accountTypeFromAuthUser(data.user);
  return { id: data.user.id, email: data.user.email, ...(authAccountType ? { authAccountType } : {}) };
}

/**
 * Supabase client for server routes.
 * In development: prefers `SUPABASE_SERVICE_ROLE_KEY` so DB/storage work without a real JWT (RLS is bypassed for that key).
 * In production: cookie-bound anon client only.
 */
export async function getServerSupabase(): Promise<SupabaseClient> {
  if (isDevAuthBypass() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { url } = getSupabaseEnv();
    return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return supabaseServer();
}
