import { StudyWorkspace } from "@/components/workspace/StudyWorkspace";

export default function WorkspacePage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">Study workspace</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
          One PDF is one unit. Highlight source text, write your own summary, then ask the coach for structured feedback.
          Flashcards and quizzes will plug into saved summaries next.
        </p>
      </div>
      <StudyWorkspace />
    </div>
  );
}
