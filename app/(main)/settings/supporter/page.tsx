import { redirect } from "next/navigation";

import { SupporterSettingsClient } from "@/app/(main)/settings/supporter-settings";
import { getAccountRoleContext, SETTINGS_SETUP_HINT } from "@/lib/auth/accountRoleContext";
import { getServerSupabase } from "@/lib/auth/serverAuth";
import { isSupabaseSchemaMissingError } from "@/lib/supabase/migrationErrors";

export default async function SupporterSettingsPage() {
  const ctx = await getAccountRoleContext();
  if (!ctx.user) redirect("/login?next=/settings/supporter");
  if (ctx.role !== "supporter") redirect("/settings");

  const supabase = await getServerSupabase();
  const { data: audioRows, error: audioErr } = await supabase
    .from("user_audio")
    .select("type,file_url,created_at")
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  let initialSetupError = ctx.initialSetupError;
  if (audioErr && isSupabaseSchemaMissingError(audioErr.message)) {
    initialSetupError = initialSetupError ?? SETTINGS_SETUP_HINT;
  }

  const latest = { before: null as string | null, after: null as string | null };
  for (const r of audioRows ?? []) {
    if (r.type === "before" && !latest.before) latest.before = r.file_url;
    if (r.type === "after" && !latest.after) latest.after = r.file_url;
  }

  return <SupporterSettingsClient initialHasAudio={latest} initialSetupError={initialSetupError} />;
}
