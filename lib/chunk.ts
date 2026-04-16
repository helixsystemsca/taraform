/**
 * Split plain text into chunks up to `size` characters, preferring sentence boundaries.
 */
export function chunkText(text: string, size = 2000): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let i = 0;

  while (i < normalized.length) {
    const end = Math.min(i + size, normalized.length);
    if (end === normalized.length) {
      chunks.push(normalized.slice(i).trim());
      break;
    }

    const slice = normalized.slice(i, end);
    const rel = findSentenceSplitIndex(slice, Math.max(0, slice.length - 400));
    if (rel > 0) {
      chunks.push(normalized.slice(i, i + rel).trim());
      i += rel;
      while (normalized[i] === "\n" || normalized[i] === " ") i++;
      continue;
    }

    const hard = slice.lastIndexOf("\n");
    if (hard > size * 0.4) {
      chunks.push(normalized.slice(i, i + hard + 1).trim());
      i += hard + 1;
      continue;
    }

    const space = slice.lastIndexOf(" ");
    if (space > size * 0.5) {
      chunks.push(normalized.slice(i, i + space).trim());
      i += space + 1;
      continue;
    }

    chunks.push(slice.trim());
    i = end;
  }

  return chunks.filter(Boolean);
}

/** Returns length from start of slice to split after (exclusive), or 0 if none. */
function findSentenceSplitIndex(slice: string, minIndex: number): number {
  const sentenceEnd = /[.!?]["')\]]?\s+/g;
  let best = 0;
  let m: RegExpExecArray | null;
  while ((m = sentenceEnd.exec(slice)) !== null) {
    const end = m.index + m[0].length;
    if (end >= minIndex && end <= slice.length) best = end;
  }
  return best;
}
