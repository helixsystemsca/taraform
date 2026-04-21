import { redirect } from "next/navigation";

import { UserSettingsClient } from "@/app/(main)/settings/user-settings";
import { getAccountRoleContext } from "@/lib/auth/accountRoleContext";

export default async function SettingsPage() {
  const { user, role, profile, initialSetupError } = await getAccountRoleContext();
  if (!user) redirect("/login?next=/settings");
  if (role === "supporter") redirect("/settings/supporter");

  return <UserSettingsClient initialProfile={profile} initialSetupError={initialSetupError} />;
}
