"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { QuizObject } from "@/lib/ai/schemas";

export type QuizQuestionWithId = QuizObject["questions"][number] & { id: string };

export interface StudySection {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  title: string;
  extractedText: string;
  keyConcepts: string[];
  pageNumber?: number;
}

export interface QuizResult {
  questionId: string;
  confidence: number;
  isCorrect: boolean;
  timeSpent: number;
}

export interface QuizAttempt {
  attemptedAt: number;
  correct: number;
  total: number;
  scorePct: number;
}

export type TaraformExportV1 = {
  version: 1;
  exportedAt: string;
  sections: StudySection[];
  textNotes: Record<string, string>;
  sketchPathsJson: Record<string, string>;
  quizzes: Record<string, QuizQuestionWithId[]>;
  quizResults: Record<string, QuizResult[]>;
  quizAttempts: Record<string, QuizAttempt[]>;
  timeSpent: Record<string, number>;
  selectedSectionId: string | null;
};

type StudyStore = {
  /** Ephemeral UI (not persisted) */
  uploadBusy: boolean;
  setUploadBusy: (busy: boolean) => void;

  sections: StudySection[];
  selectedSectionId: string | null;
  /** Typed / markdown notes per section */
  textNotes: Record<string, string>;
  /** JSON string of `CanvasPath[]` from react-sketch-canvas */
  sketchPathsJson: Record<string, string>;
  quizzes: Record<string, QuizQuestionWithId[]>;
  quizResults: Record<string, QuizResult[]>;
  quizAttempts: Record<string, QuizAttempt[]>;
  timeSpent: Record<string, number>;

  addSections: (newSections: StudySection[]) => void;
  selectSection: (id: string | null) => void;
  updateTextNotes: (sectionId: string, text: string) => void;
  updateSketchPathsJson: (sectionId: string, json: string) => void;
  setQuizForSection: (sectionId: string, questions: QuizQuestionWithId[]) => void;
  addQuizResult: (sectionId: string, result: QuizResult) => void;
  addQuizAttempt: (sectionId: string, attempt: QuizAttempt) => void;
  updateTimeSpent: (sectionId: string, seconds: number) => void;
  resetStore: () => void;
  exportSnapshot: () => string;
  importSnapshot: (json: string) => void;
};

const emptyState = {
  sections: [] as StudySection[],
  selectedSectionId: null as string | null,
  textNotes: {} as Record<string, string>,
  sketchPathsJson: {} as Record<string, string>,
  quizzes: {} as Record<string, QuizQuestionWithId[]>,
  quizResults: {} as Record<string, QuizResult[]>,
  quizAttempts: {} as Record<string, QuizAttempt[]>,
  timeSpent: {} as Record<string, number>,
};

export const useStudyStore = create<StudyStore>()(
  persist(
    (set, get) => ({
      ...emptyState,
      uploadBusy: false,
      setUploadBusy: (busy) => set({ uploadBusy: busy }),

      addSections: (newSections) =>
        set((s) => ({
          sections: [...s.sections, ...newSections],
          selectedSectionId:
            s.selectedSectionId ?? newSections[0]?.id ?? s.selectedSectionId,
        })),

      selectSection: (id) => set({ selectedSectionId: id }),

      updateTextNotes: (sectionId, text) =>
        set((s) => ({
          textNotes: { ...s.textNotes, [sectionId]: text },
        })),

      updateSketchPathsJson: (sectionId, json) =>
        set((s) => ({
          sketchPathsJson: { ...s.sketchPathsJson, [sectionId]: json },
        })),

      setQuizForSection: (sectionId, questions) =>
        set((s) => ({
          quizzes: { ...s.quizzes, [sectionId]: questions },
        })),

      addQuizResult: (sectionId, result) =>
        set((s) => ({
          quizResults: {
            ...s.quizResults,
            [sectionId]: [...(s.quizResults[sectionId] || []), result],
          },
        })),

      addQuizAttempt: (sectionId, attempt) =>
        set((s) => ({
          quizAttempts: {
            ...s.quizAttempts,
            [sectionId]: [...(s.quizAttempts[sectionId] || []), attempt].slice(-50),
          },
        })),

      updateTimeSpent: (sectionId, seconds) =>
        set((s) => ({
          timeSpent: {
            ...s.timeSpent,
            [sectionId]: (s.timeSpent[sectionId] || 0) + Math.max(0, seconds),
          },
        })),

      resetStore: () => set({ ...emptyState, uploadBusy: false }),

      exportSnapshot: () => {
        const s = get();
        const payload: TaraformExportV1 = {
          version: 1,
          exportedAt: new Date().toISOString(),
          sections: s.sections,
          textNotes: s.textNotes,
          sketchPathsJson: s.sketchPathsJson,
          quizzes: s.quizzes,
          quizResults: s.quizResults,
          quizAttempts: s.quizAttempts,
          timeSpent: s.timeSpent,
          selectedSectionId: s.selectedSectionId,
        };
        return JSON.stringify(payload, null, 2);
      },

      importSnapshot: (json) => {
        const parsed = JSON.parse(json) as Partial<TaraformExportV1>;
        if (!parsed || typeof parsed !== "object") throw new Error("Invalid backup file.");
        if (parsed.version !== 1) throw new Error("Unsupported backup version.");
        set({
          sections: Array.isArray(parsed.sections) ? parsed.sections : [],
          textNotes: parsed.textNotes && typeof parsed.textNotes === "object" ? parsed.textNotes : {},
          sketchPathsJson:
            parsed.sketchPathsJson && typeof parsed.sketchPathsJson === "object"
              ? parsed.sketchPathsJson
              : {},
          quizzes: parsed.quizzes && typeof parsed.quizzes === "object" ? parsed.quizzes : {},
          quizResults:
            parsed.quizResults && typeof parsed.quizResults === "object" ? parsed.quizResults : {},
          quizAttempts:
            parsed.quizAttempts && typeof parsed.quizAttempts === "object" ? parsed.quizAttempts : {},
          timeSpent: parsed.timeSpent && typeof parsed.timeSpent === "object" ? parsed.timeSpent : {},
          selectedSectionId:
            typeof parsed.selectedSectionId === "string" || parsed.selectedSectionId === null
              ? parsed.selectedSectionId
              : null,
        });
      },
    }),
    {
      name: "taraform-study-storage",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        sections: s.sections,
        selectedSectionId: s.selectedSectionId,
        textNotes: s.textNotes,
        sketchPathsJson: s.sketchPathsJson,
        quizzes: s.quizzes,
        quizResults: s.quizResults,
        quizAttempts: s.quizAttempts,
        timeSpent: s.timeSpent,
      }),
    },
  ),
);
