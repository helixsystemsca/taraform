"use client";

import * as React from "react";
import { UploadCloud } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { SupportMessagesSettings } from "@/components/settings/SupportMessagesSettings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEncouragementAudio } from "@/hooks/useEncouragementAudio";

type Profile = {
  id: string;
  email: string | null;
  notifications_enabled: boolean;
  created_at: string;
};

type AudioPresence = { before: string | null; after: string | null };

function UploadRow({
  label,
  type,
  hasExisting,
  onUploaded,
}: {
  label: string;
  type: "before" | "after";
  hasExisting: boolean;
  onUploaded: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState<{ kind: "idle" | "ok" | "err"; message?: string }>({ kind: "idle" });

  function pick() {
    setStatus({ kind: "idle" });
    inputRef.current?.click();
  }

  function upload(file: File) {
    setProgress(0);
    setStatus({ kind: "idle" });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/audio/upload?type=${encodeURIComponent(type)}`);
    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      setProgress(Math.round((evt.loaded / evt.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        setStatus({ kind: "ok", message: "Saved ✓" });
        onUploaded();
        return;
      }
      try {
        const json = JSON.parse(xhr.responseText) as { error?: string };
        setStatus({ kind: "err", message: json.error || "Upload failed." });
      } catch {
        setStatus({ kind: "err", message: "Upload failed." });
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setStatus({ kind: "err", message: "Network error." });
    };

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  }

  return (
    <div className="rounded-2xl border border-[rgba(120,90,80,0.10)] bg-surface-page/75 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">{label}</div>
          <p className="mt-1 text-xs text-ink/55">
            {hasExisting ? "Audio uploaded." : "No audio uploaded yet."} MP3 only (max 10MB).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,audio/mpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.currentTarget.value = "";
            }}
          />
          <Button type="button" variant="ghost" onClick={pick}>
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload MP3
          </Button>
        </div>
      </div>

      {progress != null ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-ink/55">
            <span>Uploading…</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.06]">
            <div className="h-full bg-copper transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {status.kind !== "idle" ? (
        <div
          className={cn(
            "mt-3 rounded-xl border px-3 py-2 text-sm",
            status.kind === "ok"
              ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-800"
              : "border-red-200/70 bg-red-50/70 text-red-800",
          )}
        >
          {status.message}
        </div>
      ) : null}
    </div>
  );
}

export function SettingsClient({
  initialProfile,
  initialHasAudio,
}: {
  initialProfile: Profile | null;
  initialHasAudio: AudioPresence;
}) {
  const [profile, setProfile] = React.useState<Profile | null>(initialProfile);
  const [savingNotif, setSavingNotif] = React.useState(false);
  const [saveBadge, setSaveBadge] = React.useState<string | null>(null);

  const [presence, setPresence] = React.useState<AudioPresence>(initialHasAudio);
  const audio = useEncouragementAudio();

  React.useEffect(() => {
    // If profile is missing (trigger not installed), the API will upsert it.
    if (profile) return;
    void fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((j: { profile?: Profile | null }) => setProfile(j.profile ?? null))
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

  function onUploaded(type: "before" | "after") {
    setPresence((p) => ({ ...p, [type]: "yes" }));
    void audio.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-5">
      <div>
        <div className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">Settings</div>
        <p className="mt-1 text-sm text-ink/55">Preferences and encouragement audio.</p>
      </div>

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-ink">Encouragement audio</div>
            <p className="mt-1 text-sm text-ink/55">Upload MP3s to play before and after sessions.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" disabled={!audio.data?.before} onClick={() => void audio.playBefore()}>
              Preview “Before”
            </Button>
            <Button type="button" variant="ghost" disabled={!audio.data?.after} onClick={() => void audio.playAfter()}>
              Preview “After”
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <UploadRow label="Before Study" type="before" hasExisting={!!presence.before} onUploaded={() => onUploaded("before")} />
          <UploadRow
            label="After Completion"
            type="after"
            hasExisting={!!presence.after}
            onUploaded={() => onUploaded("after")}
          />
        </div>

        {audio.error ? <div className="mt-3 text-xs text-ink/55">Audio note: {audio.error}</div> : null}
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <SupportMessagesSettings />
      </GlassCard>
    </div>
  );
}

