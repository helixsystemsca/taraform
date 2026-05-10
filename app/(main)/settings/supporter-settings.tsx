"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, UploadCloud } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { SupportMessagesSettings } from "@/components/settings/SupportMessagesSettings";
import { Button } from "@/components/ui/button";
import { useEncouragementAudio } from "@/hooks/useEncouragementAudio";
import { cn } from "@/lib/utils";

export type SupporterAudioRow = {
  id: string;
  type: "before" | "after";
  file_url: string;
  created_at: string;
};

function UploadRow({
  label,
  type,
  count,
  onUploaded,
}: {
  label: string;
  type: "before" | "after";
  count: number;
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
        setStatus({ kind: "ok", message: "Saved to your library ✓" });
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
            {count === 0 ? "No files yet." : `${count} in library`} · MP3 only (max 10MB). Each upload is kept — playback picks one at random.
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

function AudioLibraryList({
  rows,
  onDeleted,
}: {
  rows: SupporterAudioRow[];
  onDeleted: () => void;
}) {
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/audio/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        window.alert(j.error ?? "Delete failed");
        return;
      }
      onDeleted();
    } finally {
      setBusyId(null);
    }
  }

  if (!rows.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-[rgba(120,90,80,0.08)] bg-white/50">
      <div className="border-b border-[rgba(120,90,80,0.08)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        Library ({rows.length})
      </div>
      <ul className="max-h-52 divide-y divide-[rgba(120,90,80,0.06)] overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 px-3 py-2 text-xs">
            <span className="rounded-md bg-copper/10 px-1.5 py-px font-medium text-copper">{r.type}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-muted">{r.file_url.split("/").pop()}</span>
            <span className="shrink-0 text-[10px] text-ink-muted">{new Date(r.created_at).toLocaleString()}</span>
            <button
              type="button"
              disabled={busyId === r.id}
              className="shrink-0 rounded-lg p-1.5 text-ink-muted hover:bg-rose-light/50 hover:text-rose-deep"
              aria-label="Remove audio"
              onClick={() => void remove(r.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SupporterSettingsClient({
  initialAudioRows,
  initialSetupError,
}: {
  initialAudioRows: SupporterAudioRow[];
  initialSetupError?: string | null;
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<SupporterAudioRow[]>(initialAudioRows);
  const [setupError] = React.useState<string | null>(initialSetupError ?? null);
  const audio = useEncouragementAudio();

  React.useEffect(() => {
    setRows(initialAudioRows);
  }, [initialAudioRows]);

  const beforeCount = rows.filter((r) => r.type === "before").length;
  const afterCount = rows.filter((r) => r.type === "after").length;

  function onLibraryChanged() {
    void audio.refresh();
    router.refresh();
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
            <p className="mt-1 text-sm text-ink/55">
              Build a library of MP3s for before and after sessions. Taraform picks a random file from the matching pool when
              you start or finish flashcards, quizzes, and study sessions.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" disabled={!audio.beforeUrls.length} onClick={() => void audio.playBefore()}>
              Preview random “Before”
            </Button>
            <Button type="button" variant="ghost" disabled={!audio.afterUrls.length} onClick={() => void audio.playAfter()}>
              Preview random “After”
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <UploadRow label="Before sessions" type="before" count={beforeCount} onUploaded={onLibraryChanged} />
            <AudioLibraryList rows={rows.filter((r) => r.type === "before")} onDeleted={onLibraryChanged} />
          </div>
          <div>
            <UploadRow label="After sessions" type="after" count={afterCount} onUploaded={onLibraryChanged} />
            <AudioLibraryList rows={rows.filter((r) => r.type === "after")} onDeleted={onLibraryChanged} />
          </div>
        </div>

        {audio.error ? <div className="mt-3 text-xs text-ink/55">Audio note: {audio.error}</div> : null}
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <SupportMessagesSettings />
      </GlassCard>
    </div>
  );
}
