import "server-only";

import { createHash } from "crypto";

export function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function estimateTokens(text: string) {
  // Very rough estimate: ~4 chars/token for English text.
  return Math.ceil(text.length / 4);
}

