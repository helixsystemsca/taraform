export type SupportMessage = {
  id: string;
  text: string;
  /** Data URL or remote URL from upload */
  audioUrl?: string;
};

export const SUPPORT_MESSAGES_KEY = "support_messages";

export function loadSupportMessages(): SupportMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SUPPORT_MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is SupportMessage => {
        if (!x || typeof x !== "object") return false;
        const o = x as Record<string, unknown>;
        return typeof o.id === "string" && typeof o.text === "string";
      })
      .map((m) => ({
        id: m.id,
        text: m.text,
        audioUrl: typeof m.audioUrl === "string" && m.audioUrl.length > 0 ? m.audioUrl : undefined,
      }));
  } catch {
    return [];
  }
}

export function saveSupportMessages(messages: SupportMessage[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SUPPORT_MESSAGES_KEY, JSON.stringify(messages));
  } catch {
    /* quota or private mode */
  }
}

export function pickRandomSupportMessage(messages: SupportMessage[]): SupportMessage | null {
  if (!messages.length) return null;
  const i = Math.floor(Math.random() * messages.length);
  return messages[i] ?? null;
}
