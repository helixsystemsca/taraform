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
    .select("id,type,file_url,created_at")
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  let initialSetupError = ctx.initialSetupError;
  if (audioErr && isSupabaseSchemaMissingError(audioErr.message)) {
    initialSetupError = initialSetupError ?? SETTINGS_SETUP_HINT;
  }

  return (
    <SupporterSettingsClient initialAudioRows={audioRows ?? []} initialSetupError={initialSetupError} />
  );
}
