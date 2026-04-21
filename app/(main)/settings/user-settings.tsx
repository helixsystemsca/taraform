"use client";

import * as React from "react";

import { GlassCard } from "@/components/glass/GlassCard";
import { PasswordSettings } from "@/components/settings/PasswordSettings";
import { cn } from "@/lib/utils";

export type UserProfile = {
  id: string;
  email: string | null;
  notifications_enabled: boolean;
  created_at: string;
  account_type?: "user" | "supporter";
};

export function UserSettingsClient({
  initialProfile,
  initialSetupError,
}: {
  initialProfile: UserProfile | null;
  initialSetupError?: string | null;
}) {
  const [profile, setProfile] = React.useState<UserProfile | null>(initialProfile);
  const [setupError, setSetupError] = React.useState<string | null>(initialSetupError ?? null);
  const [savingNotif, setSavingNotif] = React.useState(false);
  const [saveBadge, setSaveBadge] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (profile) return;
    void fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((j: { profile?: UserProfile | null; setupError?: string }) => {
        setProfile(j.profile ?? null);
        if (j.setupError) setSetupError(j.setupError);
      })
      .catch(() => null);
  }, [profile]);

  async function toggleNotifications(next: boolean) {
    setSavingNotif(true);
    setSaveBadge(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications_enabled: next }),
      });
      if (!res.ok) throw new Error("Save failed.");
      setProfile((p) => (p ? { ...p, notifications_enabled: next } : p));
      setSaveBadge("Saved ✓");
      window.setTimeout(() => setSaveBadge(null), 1500);
    } catch {
      setSaveBadge("Could not save");
      window.setTimeout(() => setSaveBadge(null), 2000);
    } finally {
      setSavingNotif(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-5">
      <div>
        <div className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">Settings</div>
        <p className="mt-1 text-sm text-ink/55">Your study preferences and account security.</p>
      </div>

      {setupError ? (
        <GlassCard className="border border-amber-200/80 bg-amber-50/60 p-4 text-sm text-amber-950 shadow-none">
          {setupError}
        </GlassCard>
      ) : null}

      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">Notifications</div>
            <p className="mt-1 text-sm text-ink/55">Enable gentle reminders (stored per account).</p>
          </div>
          <div className="flex items-center gap-3">
            {saveBadge ? <div className="text-xs font-medium text-ink/55">{saveBadge}</div> : null}
            <button
              type="button"
              disabled={savingNotif || !profile}
              onClick={() => toggleNotifications(!(profile?.notifications_enabled ?? false))}
              className={cn(
                "relative inline-flex h-8 w-14 items-center rounded-full border transition-editorial",
                "border-[rgba(120,90,80,0.14)] bg-surface-page/80",
                (profile?.notifications_enabled ?? false) && "bg-rose-light/70",
                (savingNotif || !profile) && "opacity-60",
              )}
              aria-pressed={profile?.notifications_enabled ?? false}
            >
              <span
                className={cn(
                  "absolute left-1 inline-block size-6 rounded-full bg-white shadow-sm transition-transform",
                  (profile?.notifications_enabled ?? false) && "translate-x-6",
                )}
              />
            </button>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <PasswordSettings />
      </GlassCard>
    </div>
  );
}
