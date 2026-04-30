"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { QuizObject } from "@/lib/ai/schemas";
import type { AppWorkspace } from "@/lib/appMode";
import { DEFAULT_WORKSPACE } from "@/lib/appMode";
import type { StudyPlanItem } from "@/lib/studyPlan";
import { generateStudyPlan } from "@/lib/studyPlan";

export type QuizQuestionWithId = QuizObject["questions"][number] & { id: string };

export interface StudySection {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  title: string;
  extractedText: string;
  keyConcepts: string[];
  pageNumber?: number;
  /** 2-stage PDF pipeline: identifies which uploaded PDF this section came from. */
  sourceFileId?: string;
  sourceFileHash?: string;
  /** If true, this section is only a cheap doc-map stub and needs on-demand deep processing. */
  needsDeepProcessing?: boolean;
  /** Study vs PM workspace; omitted / undefined treated as study for legacy data. */
  workspace?: AppWorkspace;
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
  studyPlan: {
    generatedAt: number;
    items: StudyPlanItem[];
    completed: Record<string, boolean>;
  };
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
  studyPlan: {
    generatedAt: number;
    items: StudyPlanItem[];
    completed: Record<string, boolean>;
  };

  /** PDF chunks cached client-side for on-demand deep processing (keyed by file_hash). */
  pdfChunksByFileHash: Record<string, string[]>;
  setPdfChunksForFile: (fileHash: string, chunks: string[]) => void;

  /** Update a section in-place (used after on-demand deep processing). */
  updateSection: (sectionId: string, patch: Partial<StudySection>) => void;

  addSections: (newSections: StudySection[]) => void;
  selectSection: (id: string | null) => void;
  updateTextNotes: (sectionId: string, text: string) => void;
  updateSketchPathsJson: (sectionId: string, json: string) => void;
  setQuizForSection: (sectionId: string, questions: QuizQuestionWithId[]) => void;
  addQuizResult: (sectionId: string, result: QuizResult) => void;
  addQuizAttempt: (sectionId: string, attempt: QuizAttempt) => void;
  regenerateStudyPlan: () => void;
  completeStudyPlanItem: (sectionId: string) => void;
  resetStudyPlanSession: () => void;
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
  studyPlan: { generatedAt: 0, items: [] as StudyPlanItem[], completed: {} as Record<string, boolean> },
  pdfChunksByFileHash: {} as Record<string, string[]>,
};

export const useStudyStore = create<StudyStore>()(
  persist(
    (set, get) => ({
      ...emptyState,
      uploadBusy: false,
      setUploadBusy: (busy) => set({ uploadBusy: busy }),

      addSections: (newSections) =>
        set((s) => ({
          sections: [
            ...s.sections,
            ...newSections.map((sec) => ({
              ...sec,
              workspace: sec.workspace ?? DEFAULT_WORKSPACE,
            })),
          ],
          selectedSectionId:
            s.selectedSectionId ?? newSections[0]?.id ?? s.selectedSectionId,
        })),

      selectSection: (id) => set({ selectedSectionId: id }),

      setPdfChunksForFile: (fileHash, chunks) =>
        set((s) => ({
          pdfChunksByFileHash: { ...s.pdfChunksByFileHash, [fileHash]: chunks },
        })),

      updateSection: (sectionId, patch) =>
        set((s) => ({
          sections: s.sections.map((sec) => (sec.id === sectionId ? { ...sec, ...patch } : sec)),
        })),

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

      regenerateStudyPlan: () =>
        set((s) => ({
          studyPlan: {
            generatedAt: Date.now(),
            items: generateStudyPlan({
              sections: s.sections,
              quizAttempts: s.quizAttempts,
              timeSpent: s.timeSpent,
            }),
            completed: {},
          },
        })),

      completeStudyPlanItem: (sectionId) =>
        set((s) => ({
          studyPlan: {
            ...s.studyPlan,
            completed: { ...s.studyPlan.completed, [sectionId]: true },
          },
        })),

      resetStudyPlanSession: () =>
        set((s) => ({
          studyPlan: { ...s.studyPlan, completed: {} },
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
          studyPlan: s.studyPlan,
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
          studyPlan:
            parsed.studyPlan && typeof parsed.studyPlan === "object"
              ? (parsed.studyPlan as TaraformExportV1["studyPlan"])
              : { generatedAt: 0, items: [], completed: {} },
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
        studyPlan: s.studyPlan,
        timeSpent: s.timeSpent,
      }),
    },
  ),
);
