"use client";

import * as React from "react";
import { Volume2 } from "lucide-react";

import type { SupportMessage } from "@/lib/supportMessages";
import { cn } from "@/lib/utils";

const globalAudioRef = { current: null as HTMLAudioElement | null };

function stopGlobalSupportAudio() {
  const a = globalAudioRef.current;
  if (a) {
    a.pause();
    a.currentTime = 0;
    globalAudioRef.current = null;
  }
}

export function SupportMessageOverlay({
  message,
  onDismiss,
}: {
  message: SupportMessage;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    stopGlobalSupportAudio();
    if (message.audioUrl) {
      const el = new Audio(message.audioUrl);
      globalAudioRef.current = el;
      void el.play().catch(() => {
        /* autoplay blocked */
      });
    }
    let leaveTimer: number | undefined;
    const t = window.setTimeout(() => {
      setLeaving(true);
      leaveTimer = window.setTimeout(() => {
        stopGlobalSupportAudio();
        onDismiss();
      }, 280);
    }, 4000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      if (leaveTimer) window.clearTimeout(leaveTimer);
      stopGlobalSupportAudio();
    };
  }, [message, onDismiss]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 z-[90] w-[min(92vw,380px)] -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0",
        "transition-all duration-300 ease-out",
        visible && !leaving ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto rounded-xl border border-[rgba(120,90,80,0.12)] bg-surface-panel/92 px-4 py-3 shadow-warm",
          "backdrop-blur-md",
        )}
      >
        <div className="flex items-start gap-2">
          {message.audioUrl ? (
            <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-copper" aria-hidden />
          ) : null}
          <p className="text-sm leading-snug text-ink">{message.text}</p>
        </div>
      </div>
    </div>
  );
}
