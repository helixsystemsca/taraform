"use client";

import * as React from "react";
import Link from "next/link";
import { UploadCloud } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { SupportMessagesSettings } from "@/components/settings/SupportMessagesSettings";
import { Button } from "@/components/ui/button";
import { useEncouragementAudio } from "@/hooks/useEncouragementAudio";
import { cn } from "@/lib/utils";

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

export function SupporterSettingsClient({
  initialHasAudio,
  initialSetupError,
}: {
  initialHasAudio: AudioPresence;
  initialSetupError?: string | null;
}) {
  const [presence, setPresence] = React.useState<AudioPresence>(initialHasAudio);
  const [setupError] = React.useState<string | null>(initialSetupError ?? null);
  const audio = useEncouragementAudio();

  function onUploaded(type: "before" | "after") {
    setPresence((p) => ({ ...p, [type]: "yes" }));
    void audio.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">Supporter settings</div>
          <p className="mt-1 text-sm text-ink/55">Encouragement audio and messages for study sessions.</p>
        </div>
        <Button type="button" variant="ghost" asChild className="shrink-0 border border-[rgba(120,90,80,0.14)] bg-surface-page/80">
          <Link href="/settings/security">Password & sign-in</Link>
        </Button>
      </div>

      {setupError ? (
        <GlassCard className="border border-amber-200/80 bg-amber-50/60 p-4 text-sm text-amber-950 shadow-none">
          {setupError}
        </GlassCard>
      ) : null}

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
