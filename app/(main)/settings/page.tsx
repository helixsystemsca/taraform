import { redirect } from "next/navigation";

import { SettingsClient } from "@/app/(main)/settings/ui";
import { supabaseServer } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login?next=/settings");

  // Fetch profile + latest audio paths for empty states.
  const userId = data.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,notifications_enabled,created_at")
    .eq("id", userId)
    .maybeSingle();

  const { data: audioRows } = await supabase
    .from("user_audio")
    .select("type,file_url,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const latest = { before: null as string | null, after: null as string | null };
  for (const r of audioRows ?? []) {
    if (r.type === "before" && !latest.before) latest.before = r.file_url;
    if (r.type === "after" && !latest.after) latest.after = r.file_url;
  }

  return <SettingsClient initialProfile={profile ?? null} initialHasAudio={latest} />;
}

