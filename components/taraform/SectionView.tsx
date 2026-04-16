"use client";

import * as React from "react";
import { ArrowLeft, Sparkles, Wand2 } from "lucide-react";

import { generateQuizForSection } from "@/app/actions/generateQuizForSection";
import { AnalyticsPanel } from "@/components/taraform/AnalyticsPanel";
import { QuizRunner } from "@/components/taraform/QuizRunner";
import { SectionNotesPanel } from "@/components/taraform/SectionNotesPanel";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withQuestionIds } from "@/lib/quizWithIds";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/useStudyStore";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, concepts: string[]) {
  const usable = concepts
    .map((c) => c.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .slice(0, 20);
  if (!usable.length) return [text];
  const re = new RegExp(`\\b(${usable.map(escapeRegExp).join("|")})\\b`, "gi");
  const parts: (string | { hit: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    const hit = m[0] ?? "";
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push({ hit });
    last = idx + hit.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function SectionView(props: { sectionId: string }) {
  const section = useStudyStore((s) => s.sections.find((x) => x.id === props.sectionId));
  const selectSection = useStudyStore((s) => s.selectSection);
  const textNotes = useStudyStore((s) => s.textNotes[props.sectionId] ?? "");
  const sketchJson = useStudyStore((s) => s.sketchPathsJson[props.sectionId]);
  const quiz = useStudyStore((s) => s.quizzes[props.sectionId]);
  const updateTextNotes = useStudyStore((s) => s.updateTextNotes);
  const updateSketchPathsJson = useStudyStore((s) => s.updateSketchPathsJson);
  const setQuizForSection = useStudyStore((s) => s.setQuizForSection);
  const updateTimeSpent = useStudyStore((s) => s.updateTimeSpent);

  const [tab, setTab] = React.useState("content");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      updateTimeSpent(props.sectionId, 20);
    }, 20000);
    return () => {
      window.clearInterval(id);
      updateTimeSpent(props.sectionId, 1);
    };
  }, [props.sectionId, updateTimeSpent]);

  async function onGenerateQuiz() {
    if (!section) return;
    setError(null);
    setIsGenerating(true);
    try {
      const result = await generateQuizForSection({
        sectionTitle: section.title,
        extractedText: section.extractedText,
        keyConcepts: section.keyConcepts ?? [],
      });
      setQuizForSection(props.sectionId, withQuestionIds(result.questions));
      setTab("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quiz generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!section) {
    return (
      <GlassCard className="p-6">
        <p className="text-sm text-ink/65">This section is no longer in your library.</p>
        <Button type="button" variant="ghost" className="mt-3" onClick={() => selectSection(null)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </GlassCard>
    );
  }

  const highlighted = highlightText(section.extractedText, section.keyConcepts ?? []);

  return (
    <div className="space-y-6">
      <GlassCard className="relative overflow-hidden p-6 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-rose-light/40 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => selectSection(null)}>
              <ArrowLeft className="h-4 w-4 text-copper" />
              Library
            </Button>
            <CardHeader className="p-0">
              <CardTitle className="text-xl font-medium tracking-[-0.03em] sm:text-2xl">{section.title}</CardTitle>
              <CardDescription className="mt-2 text-[13px]">
                Chapter {section.chapterNumber}: {section.chapterTitle}
                {section.pageNumber ? ` · ~page ${section.pageNumber}` : ""}
              </CardDescription>
            </CardHeader>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => void onGenerateQuiz()} disabled={isGenerating}>
              <Sparkles className="h-4 w-4" />
              {isGenerating ? "Generating…" : "Generate quiz"}
            </Button>
          </div>
        </div>
      </GlassCard>

      {error ? (
        <GlassCard className="border border-red-200 bg-red-50/90 p-4 text-sm text-red-800">{error}</GlassCard>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto min-h-11 w-full flex-wrap justify-start gap-1 rounded-2xl py-2">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="notes">My Notes</TabsTrigger>
          <TabsTrigger value="quiz">Generate Quiz</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          <GlassCard className="overflow-hidden p-0">
            <div className="border-b border-[rgba(120,90,80,0.08)] bg-rose-light/35 px-5 py-3 sm:px-6">
              <div className="font-display text-sm font-medium text-ink">Extracted text</div>
              <p className="mt-0.5 text-xs text-ink-secondary">Key concepts are highlighted when they match the phrase list.</p>
            </div>
            <div className="bg-surface-page/80 px-6 py-8 sm:px-10 sm:py-10">
              <div className="mx-auto max-w-[700px] whitespace-pre-wrap text-[16px] leading-[1.65] text-ink">
                {highlighted.map((p, i) =>
                  typeof p === "string" ? (
                    <React.Fragment key={i}>{p}</React.Fragment>
                  ) : (
                    <mark
                      key={i}
                      className={cn(
                        "rounded px-1 py-0.5 text-ink [box-decoration-break:clone]",
                        "bg-highlight",
                      )}
                    >
                      {p.hit}
                    </mark>
                  ),
                )}
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <SectionNotesPanel
            sectionId={props.sectionId}
            textNote={textNotes}
            sketchPathsJson={sketchJson}
            onTextChange={(t) => updateTextNotes(props.sectionId, t)}
            onSketchJsonChange={(j) => updateSketchPathsJson(props.sectionId, j)}
          />
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="default" onClick={() => void onGenerateQuiz()} disabled={isGenerating}>
              <Wand2 className="h-4 w-4 text-copper" />
              Turn notes + page into quiz
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="quiz" className="mt-4 space-y-4">
          {!quiz?.length ? (
            <GlassCard className="p-6">
              <div className="font-display text-base font-semibold text-ink">NCLEX-style quiz</div>
              <p className="mt-2 text-sm text-ink/60">
                Eight to twelve questions, grounded only in this section’s extracted text and key concepts.
              </p>
              <Button className="mt-5" variant="primary" onClick={() => void onGenerateQuiz()} disabled={isGenerating}>
                <Sparkles className="h-4 w-4" />
                {isGenerating ? "Generating…" : "Generate 8–12 questions"}
              </Button>
            </GlassCard>
          ) : (
            <QuizRunner sectionId={props.sectionId} questions={quiz} />
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <AnalyticsPanel sectionId={props.sectionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
