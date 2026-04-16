import { z } from "zod";

export const GenerateConceptsSchema = z.object({
  concepts: z.array(z.string().min(3)).min(3).max(20),
});

export const GenerateQuestionSchema = z.object({
  prompt: z.string().min(8),
  choices: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(8),
});

