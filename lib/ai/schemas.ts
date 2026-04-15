import { z } from "zod";

export const TextbookExtractionSchema = z.object({
  title: z.string(),
  chapters: z.array(
    z.object({
      chapterNumber: z.number(),
      title: z.string(),
      sections: z.array(
        z.object({
          sectionTitle: z.string(),
          extractedText: z.string(),
          keyConcepts: z.array(z.string()),
          pageNumberEstimate: z.number(),
        }),
      ),
    }),
  ),
});

export type TextbookExtraction = z.infer<typeof TextbookExtractionSchema>;

export const QuizSchema = z.object({
  questions: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("multiple_choice"),
          prompt: z.string(),
          choices: z.array(z.string()).min(2).max(8),
          correctIndex: z.number().int().min(0),
          rationale: z.string(),
          keyConcepts: z.array(z.string()).default([]),
        }),
        z.object({
          type: z.literal("select_all"),
          prompt: z.string(),
          choices: z.array(z.string()).min(2).max(10),
          correctIndices: z.array(z.number().int().min(0)).min(1),
          rationale: z.string(),
          keyConcepts: z.array(z.string()).default([]),
        }),
        z.object({
          type: z.literal("case_study"),
          vignette: z.string(),
          prompt: z.string(),
          choices: z.array(z.string()).min(2).max(8),
          correctIndex: z.number().int().min(0),
          rationale: z.string(),
          keyConcepts: z.array(z.string()).default([]),
        }),
      ]),
    )
    .min(8)
    .max(12),
});

export type QuizObject = z.infer<typeof QuizSchema>;

