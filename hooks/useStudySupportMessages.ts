"use client";

import * as React from "react";

import { loadSupportMessages, pickRandomSupportMessage, type SupportMessage } from "@/lib/supportMessages";

function randomBetween(minMs: number, maxMs: number) {
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

function isTypingOrDialogFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return true;
  if (el.getAttribute("contenteditable") === "true") return true;
  if (el.closest('[role="dialog"]') || el.closest("[data-radix-dialog-content]")) return true;
  return false;
}

const IDLE_MS = 120_000;

export function useStudySupportMessages(enabled: boolean) {
  const [toast, setToast] = React.useState<SupportMessage | null>(null);
  const timerRef = React.useRef<number | null>(null);
  const lastActivityRef = React.useRef<number>(Date.now());

  const bumpActivity = React.useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  React.useEffect(() => {
    const onAct = () => bumpActivity();
    window.addEventListener("pointerdown", onAct, true);
    window.addEventListener("keydown", onAct, true);
    return () => {
      window.removeEventListener("pointerdown", onAct, true);
      window.removeEventListener("keydown", onAct, true);
    };
  }, [bumpActivity]);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleAfter = React.useCallback(
    (delay: number) => {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (!enabled) return;
        if (isTypingOrDialogFocused()) {
          scheduleAfter(randomBetween(180_000, 360_000));
          return;
        }
        if (Date.now() - lastActivityRef.current > IDLE_MS) {
          scheduleAfter(randomBetween(180_000, 360_000));
          return;
        }
        const messages = loadSupportMessages();
        if (!messages.length) {
          scheduleAfter(randomBetween(180_000, 360_000));
          return;
        }
        const next = pickRandomSupportMessage(messages);
        if (next) setToast(next);
        else scheduleAfter(randomBetween(180_000, 360_000));
      }, delay);
    },
    [clearTimer, enabled],
  );

  React.useEffect(() => {
    if (!enabled) {
      clearTimer();
      return;
    }
    scheduleAfter(randomBetween(180_000, 360_000));
    return () => clearTimer();
  }, [clearTimer, enabled, scheduleAfter]);

  const dismissToast = React.useCallback(() => {
    setToast(null);
    if (enabled) scheduleAfter(randomBetween(180_000, 360_000));
  }, [enabled, scheduleAfter]);

  return { toast, dismissToast };
}
