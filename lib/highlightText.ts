/** Match backend `study_highlight_util.normalize_highlight_text`. */
export function normalizeHighlightText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export async function computeHighlightTextHash(text: string): Promise<string> {
  const norm = normalizeHighlightText(text);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return `rgba(255, 230, 120, ${alpha})`;
  const r = Number.parseInt(m[1], 16);
  const g = Number.parseInt(m[2], 16);
  const b = Number.parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
