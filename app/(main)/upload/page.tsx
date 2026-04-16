"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileUp, Sparkles } from "lucide-react";

import { generateQuizForSection } from "@/app/actions/generateQuizForSection";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { chunkText } from "@/lib/chunk";
import { extractPdfTextFromArrayBuffer } from "@/lib/extractPdfText";
import { mergeStructureChunks } from "@/lib/mergeSections";
import type { StructureResult } from "@/lib/openai";
import { withQuestionIds } from "@/lib/quizWithIds";
import { cn } from "@/lib/utils";
import type { StudySection } from "@/stores/useStudyStore";
import { useStudyStore } from "@/stores/useStudyStore";

function normTitle(t: string) {
  return t.trim().toLowerCase();
}

function buildExtractedTextForSection(
  s: StructureResult["sections"][number],
  contentByTitle: Map<string, string>,
) {
  const fromChunks = contentByTitle.get(normTitle(s.title))?.trim();
  if (fromChunks) return fromChunks;
  const concepts = (s.concepts ?? []).map((c) => `- ${c}`).join("\n");
  return [s.summary ? `Summary:\n${s.summary}` : null, concepts ? `Concepts:\n${concepts}` : null].filter(Boolean).join("\n\n");
}

export default function UploadPage() {
  const router = useRouter();
  const sections = useStudyStore((s) => s.sections);
  const addSections = useStudyStore((s) => s.addSections);
  const selectSection = useStudyStore((s) => s.selectSection);
  const setQuizForSection = useStudyStore((s) => s.setQuizForSection);

  const [phase, setPhase] = React.useState<"idle" | "pdf" | "chunks" | "done" | "error">("idle");
  const [status, setStatus] = React.useState<string>("");
  const [progress, setProgress] = React.useState<{ i: number; n: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [preview, setPreview] = React.useState<StructureResult["sections"]>([]);
  const [sectionIdsByTitle, setSectionIdsByTitle] = React.useState<Record<string, string>>({});
  const [quizBusy, setQuizBusy] = React.useState<Record<string, boolean>>({});

  async function onFile(file: File | null) {
    if (!file || file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      setPhase("error");
      return;
    }

    setError(null);
    setPreview([]);
    setSectionIdsByTitle({});
    setQuizBusy({});
    setPhase("pdf");
    setStatus("Processing PDF…");
    setProgress(null);

    try {
      const buf = await file.arrayBuffer();
      const text = await extractPdfTextFromArrayBuffer(buf);
      if (!text) {
        setError("No text extracted from PDF.");
        setPhase("error");
        return;
      }

      const chunks = chunkText(text, 2000);
      setPhase("chunks");
      setStatus("Generating sections…");
      setProgress({ i: 0, n: chunks.length });

      const perChunk: StructureResult[] = [];
      const contentByTitle = new Map<string, string>();

      for (let c = 0; c < chunks.length; c++) {
        setProgress({ i: c + 1, n: chunks.length });
        const res = await fetch("/api/generate-structure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: chunks[c] }),
        });
        const json = (await res.json()) as unknown;
        if (!res.ok || (json && typeof json === "object" && "error" in json)) {
          const err =
            json && typeof json === "object" && "error" in json && typeof (json as { error?: string }).error === "string"
              ? (json as { error: string }).error
              : `HTTP ${res.status}`;
          throw new Error(err);
        }
        const structure = json as StructureResult;
        perChunk.push(structure);

        for (const s of structure.sections ?? []) {
          const key = normTitle(s.title);
          if (!key) continue;
          const prev = contentByTitle.get(key);
          const next = prev ? `${prev}\n\n${chunks[c]}` : chunks[c];
          contentByTitle.set(key, next);
        }
      }

      const merged = mergeStructureChunks(perChunk);
      const mergedSections = merged.sections;
      setPreview(mergedSections);

      const chapterTitle = file.name.replace(/\.pdf$/i, "");
      const existingKeys = new Set(sections.map((s) => `${s.chapterTitle}::${normTitle(s.title)}`));
      const toAdd: StudySection[] = [];
      const titleToId: Record<string, string> = {};

      for (const s of mergedSections) {
        const key = `${chapterTitle}::${normTitle(s.title)}`;
        if (existingKeys.has(key)) continue;
        const id = crypto.randomUUID();
        titleToId[s.title] = id;
        toAdd.push({
          id,
          chapterNumber: 1,
          chapterTitle,
          title: s.title,
          extractedText: buildExtractedTextForSection(s, contentByTitle),
          keyConcepts: (s.concepts ?? []).map((c) => c.trim()).filter(Boolean),
        });
      }

      if (toAdd.length) {
        addSections(toAdd);
        selectSection(toAdd[0]!.id);
        setSectionIdsByTitle(titleToId);
      }

      setPhase("done");
      setStatus("Done");
      setProgress(null);

      if (toAdd.length) router.push("/study");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setPhase("error");
      setStatus("Failed");
      setProgress(null);
    }
  }

  async function onGenerateQuiz(title: string) {
    const sectionId = sectionIdsByTitle[title];
    if (!sectionId) return;
    const section = useStudyStore.getState().sections.find((s) => s.id === sectionId);
    if (!section) return;

    setQuizBusy((b) => ({ ...b, [title]: true }));
    try {
      const result = await generateQuizForSection({
        sectionTitle: section.title,
        extractedText: section.extractedText,
        keyConcepts: section.keyConcepts ?? [],
      });
      setQuizForSection(sectionId, withQuestionIds(result.questions));
      selectSection(sectionId);
      router.push("/study");
    } finally {
      setQuizBusy((b) => ({ ...b, [title]: false }));
    }
  }

  return (
    <div className="space-y-5">
      <GlassCard className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-copper/20 bg-blush-medium/70 px-3 py-1 text-xs font-medium text-ink/80">
              <FileUp className="h-3.5 w-3.5 text-copper" />
              Import
            </div>
            <div className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">Upload notes (PDF)</div>
            <p className="mt-2 text-sm text-ink/55">
              We extract text from your PDF, chunk it, generate sections, then add them to your library.
            </p>
          </div>
          <div className="shrink-0">
            <input
              type="file"
              accept="application/pdf"
              disabled={phase === "pdf" || phase === "chunks"}
              className="block w-full text-sm text-ink/70 file:mr-4 file:rounded-xl file:border-0 file:bg-blush-medium/70 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void onFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              phase === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-stone-200/70 bg-white/60 text-ink/70",
            )}
          >
            {status || "Idle"}
            {progress ? ` (${progress.i}/${progress.n})` : ""}
          </span>
          {error ? <span className="text-xs text-red-700">{error}</span> : null}
        </div>
      </GlassCard>

      {preview.length ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/40">Imported sections</h2>
            <span className="text-xs text-ink/45">{preview.length} detected</span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {preview.map((s) => (
              <GlassCard key={s.title} className="p-5">
                <div className="text-sm font-semibold text-ink">{s.title}</div>
                {s.summary ? <p className="mt-2 text-sm text-ink/60">{s.summary}</p> : null}
                {s.concepts?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.concepts.slice(0, 8).map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-copper/20 bg-blush-medium/60 px-2.5 py-0.5 text-[11px] text-ink/70"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={!sectionIdsByTitle[s.title]}
                    onClick={() => {
                      const id = sectionIdsByTitle[s.title];
                      if (!id) return;
                      selectSection(id);
                      router.push("/study");
                    }}
                  >
                    Open in Study
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={!sectionIdsByTitle[s.title] || !!quizBusy[s.title]}
                    onClick={() => void onGenerateQuiz(s.title)}
                  >
                    <Sparkles className="h-4 w-4 text-copper" />
                    {quizBusy[s.title] ? "Generating…" : "Generate quiz"}
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

