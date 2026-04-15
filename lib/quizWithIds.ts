import type { QuizObject } from "@/lib/ai/schemas";
import type { QuizQuestionWithId } from "@/stores/useStudyStore";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function withQuestionIds(questions: QuizObject["questions"]): QuizQuestionWithId[] {
  return questions.map((q) => ({ ...q, id: newId() }));
}
