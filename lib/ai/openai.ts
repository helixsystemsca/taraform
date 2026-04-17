import "server-only";

import { openai } from "@ai-sdk/openai";

/** Vercel AI SDK model wiring — server-only so keys never ship to the client bundle. */

// Text-only workloads should use the cheapest predictable model.
export const TARAFORM_TEXT_MODEL = "gpt-4.1-mini" as const;

// Vision workloads (image input) need a vision-capable model.
export const TARAFORM_VISION_MODEL = "gpt-4o" as const;

export function taraformTextModel() {
  return openai(TARAFORM_TEXT_MODEL);
}

export function taraformVisionModel() {
  return openai(TARAFORM_VISION_MODEL);
}

