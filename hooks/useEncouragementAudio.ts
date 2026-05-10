"use client";

import * as React from "react";

export type EncouragementAudioState = {
  beforeUrls: string[];
  afterUrls: string[];
};

function pickRandom(urls: string[]): string | null {
  if (!urls.length) return null;
  return urls[Math.floor(Math.random() * urls.length)] ?? null;
}

async function playUrl(url: string | null | undefined) {
  if (!url) return;
  try {
    const el = new Audio(url);
    el.volume = 0.92;
    el.currentTime = 0;
    await el.play();
  } catch {
    /* autoplay / decode */
  }
}

export function useEncouragementAudio() {
  const [data, setData] = React.useState<EncouragementAudioState | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/audio/get", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          setData({ beforeUrls: [], afterUrls: [] });
          return;
        }
        setData(null);
        return;
      }
      const json = (await res.json()) as { beforeUrls?: string[]; afterUrls?: string[] };
      setData({
        beforeUrls: Array.isArray(json.beforeUrls) ? json.beforeUrls : [],
        afterUrls: Array.isArray(json.afterUrls) ? json.afterUrls : [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audio");
      setData(null);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const beforeUrls = data?.beforeUrls ?? [];
  const afterUrls = data?.afterUrls ?? [];
  const allUploadedUrls = React.useMemo(() => [...beforeUrls, ...afterUrls], [beforeUrls, afterUrls]);

  const playBefore = React.useCallback(() => void playUrl(pickRandom(beforeUrls)), [beforeUrls]);

  const playAfter = React.useCallback(() => void playUrl(pickRandom(afterUrls)), [afterUrls]);

  /** Random track from all Supabase-uploaded encouragement MP3s (before + after pools). */
  const playRandomUploaded = React.useCallback(() => void playUrl(pickRandom(allUploadedUrls)), [allUploadedUrls]);

  /**
   * Random track from uploaded MP3s plus optional extra URLs (e.g. support-message data URLs).
   */
  const playRandomWithExtras = React.useCallback(
    (extras: string[]) => {
      const pool = [...extras.filter(Boolean), ...allUploadedUrls];
      void playUrl(pickRandom(pool));
    },
    [allUploadedUrls],
  );

  return {
    beforeUrls,
    afterUrls,
    allUploadedUrls,
    error,
    refresh,
    playBefore,
    playAfter,
    playRandomUploaded,
    playRandomWithExtras,
  };
}
