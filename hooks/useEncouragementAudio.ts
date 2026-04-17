"use client";

import * as React from "react";

type AudioPayload = {
  before: { url: string } | null;
  after: { url: string } | null;
};

export function useEncouragementAudio() {
  const [data, setData] = React.useState<AudioPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const beforeRef = React.useRef<HTMLAudioElement | null>(null);
  const afterRef = React.useRef<HTMLAudioElement | null>(null);

  const refresh = React.useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/audio/get", { cache: "no-store" });
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = (await res.json()) as AudioPayload;
      setData(json);
      beforeRef.current = json.before?.url ? new Audio(json.before.url) : null;
      afterRef.current = json.after?.url ? new Audio(json.after.url) : null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audio");
      setData(null);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function play(el: HTMLAudioElement | null) {
    if (!el) return;
    try {
      el.currentTime = 0;
      await el.play();
    } catch {
      // Autoplay restrictions / decode errors are non-fatal.
    }
  }

  return {
    data,
    error,
    refresh,
    playBefore: () => play(beforeRef.current),
    playAfter: () => play(afterRef.current),
  };
}

