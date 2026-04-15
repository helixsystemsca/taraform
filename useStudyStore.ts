import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface StudySection {
  id: string;
  chapterNumber: number;
  title: string;
  extractedText: string;
  keyConcepts: string[];
  pageNumber?: number;
}

interface QuizResult {
  questionId: string;
  confidence: number;     // 0-100
  isCorrect: boolean;
  timeSpent: number;      // seconds
}

type StudyStore = {
  sections: StudySection[];
  notes: Record<string, string>;           // sectionId → handwritten notes (or canvas data)
  quizResults: Record<string, QuizResult[]>;
  timeSpent: Record<string, number>;       // sectionId → total seconds

  // Actions
  addSections: (newSections: StudySection[]) => void;
  updateNotes: (sectionId: string, notes: string) => void;
  addQuizResult: (sectionId: string, result: QuizResult) => void;
  updateTimeSpent: (sectionId: string, seconds: number) => void;
  resetStore: () => void;
};

export const useStudyStore = create<StudyStore>()(
  persist(
    (set, get) => ({
      sections: [],
      notes: {},
      quizResults: {},
      timeSpent: {},

      addSections: (newSections) =>
        set({ sections: [...get().sections, ...newSections] }),

      updateNotes: (sectionId, notes) =>
        set((state) => ({
          notes: { ...state.notes, [sectionId]: notes },
        })),

      addQuizResult: (sectionId, result) =>
        set((state) => ({
          quizResults: {
            ...state.quizResults,
            [sectionId]: [...(state.quizResults[sectionId] || []), result],
          },
        })),

      updateTimeSpent: (sectionId, seconds) =>
        set((state) => ({
          timeSpent: {
            ...state.timeSpent,
            [sectionId]: (state.timeSpent[sectionId] || 0) + seconds,
          },
        })),

      resetStore: () => set({ sections: [], notes: {}, quizResults: {}, timeSpent: {} }),
    }),
    {
      name: 'taraform-study-storage',           // key in localStorage
      storage: createJSONStorage(() => localStorage),
      // Optional: skipHydration to avoid hydration mismatch in Next.js
      skipHydration: true,
    }
  )
);