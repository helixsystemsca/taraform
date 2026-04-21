import Link from "next/link";
import { redirect } from "next/navigation";

import { GlassCard } from "@/components/glass/GlassCard";
import { PasswordSettings } from "@/components/settings/PasswordSettings";
import { getAccountRoleContext, settingsHrefForRole } from "@/lib/auth/accountRoleContext";

export default async function SecuritySettingsPage() {
  const { user, role } = await getAccountRoleContext();
  if (!user) redirect("/login?next=/settings/security");

  const backHref = settingsHrefForRole(role);

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-5">
      <div>
        <Link href={backHref} className="text-sm font-medium text-copper transition-colors hover:text-rose-deep">
          ← Back to settings
        </Link>
        <div className="mt-3 font-display text-xl font-semibold tracking-[-0.02em] text-ink">Password & sign-in</div>
        <p className="mt-1 text-sm text-ink/55">Set or update the password for your email address.</p>
      </div>
      <GlassCard className="p-5 sm:p-6">
        <PasswordSettings />
      </GlassCard>
    </div>
  );
}
