"use client";

import * as React from "react";
import { Trash2, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { loadSupportMessages, saveSupportMessages, type SupportMessage } from "@/lib/supportMessages";
import { cn } from "@/lib/utils";

const MAX_AUDIO_BYTES = 2_000_000;

export function SupportMessagesSettings() {
  const [messages, setMessages] = React.useState<SupportMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [audioHint, setAudioHint] = React.useState<string | null>(null);
  const [pendingAudio, setPendingAudio] = React.useState<{ name: string; url: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setMessages(loadSupportMessages());
  }, []);

  const persist = React.useCallback((next: SupportMessage[]) => {
    setMessages(next);
    saveSupportMessages(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("taraform-support-messages-changed"));
    }
  }, []);

  function addMessage() {
    const text = draft.trim();
    if (!text) return;
    const row: SupportMessage = {
      id: `sm_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 8)}`,
      text,
      audioUrl: pendingAudio?.url,
    };
    persist([...messages, row]);
    setDraft("");
    setPendingAudio(null);
    setAudioHint(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function remove(id: string) {
    persist(messages.filter((m) => m.id !== id));
  }

  function onAudioFile(f: File | null) {
    setPendingAudio(null);
    setAudioHint(null);
    if (!f) return;
    if (!f.type.startsWith("audio/") && !/\.(mp3|m4a|wav|ogg)$/i.test(f.name)) {
      setAudioHint("Please choose an audio file.");
      return;
    }
    if (f.size > MAX_AUDIO_BYTES) {
      setAudioHint("File too large (max ~2MB for browser storage).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      if (!url) {
        setAudioHint("Could not read file.");
        return;
      }
      setPendingAudio({ name: f.name, url });
      setAudioHint(`Attached: ${f.name}`);
    };
    reader.onerror = () => setAudioHint("Read failed.");
    reader.readAsDataURL(f);
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-semibold text-ink">Support messages</div>
        <p className="mt-1 text-sm text-ink/55">
          Short encouragements shown occasionally while you study. Optional quiet audio can accompany a message.
        </p>
      </div>

      <ul className="space-y-2">
        {messages.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[rgba(120,90,80,0.15)] bg-surface-page/60 px-4 py-6 text-center text-sm text-ink-muted">
            No messages yet — add one below.
          </li>
        ) : (
          messages.map((m) => (
            <li
              key={m.id}
              className="flex items-start gap-3 rounded-xl border border-[rgba(120,90,80,0.1)] bg-white/70 px-3 py-3 text-sm shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="leading-snug text-ink">{m.text}</p>
                {m.audioUrl ? (
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-copper">
                    <Volume2 className="h-3.5 w-3.5" />
                    Audio attached
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg p-2 text-ink-muted transition-colors hover:bg-rose-light/50 hover:text-rose-deep"
                aria-label="Delete message"
                onClick={() => remove(m.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="rounded-xl border border-[rgba(120,90,80,0.1)] bg-surface-page/70 p-4">
        <label className="text-xs font-medium uppercase tracking-[0.1em] text-ink-muted">New message</label>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="You’re doing better than you think — keep going."
          className="mt-2 min-h-[88px] border-[rgba(120,90,80,0.12)] bg-white/90 text-sm"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.ogg"
            className="hidden"
            onChange={(e) => {
              onAudioFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            Optional audio
          </Button>
          <Button type="button" variant="primary" size="sm" disabled={!draft.trim()} onClick={addMessage}>
            Add message
          </Button>
        </div>
        {audioHint ? <p className={cn("mt-2 text-xs", audioHint.startsWith("Attached") ? "text-ink/55" : "text-red-700")}>{audioHint}</p> : null}
      </div>
    </div>
  );
}
