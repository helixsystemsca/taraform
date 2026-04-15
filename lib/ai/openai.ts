import { openai } from "@ai-sdk/openai";

export const TARAFORM_VISION_MODEL = "gpt-4o" as const;

export function taraformModel() {
  return openai(TARAFORM_VISION_MODEL);
}

