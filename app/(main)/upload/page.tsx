"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileUp, Sparkles } from "lucide-react";

import { generateQuizForSection } from "@/app/actions/generateQuizForSection";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { chunkText } from "@/lib/chunk";
import { extractPdfTextFromArrayBuffer } from "@/lib/extractPdfText";
import type { StructureResult } from "@/lib/openai";
import { withQuestionIds } from "@/lib/quizWithIds";
import { cn } from "@/lib/utils";
import type { StudySection } from "@/stores/useStudyStore";
import { useStudyStore } from "@/stores/useStudyStore";

function normTitle(t: string) {
  return t.trim().toLowerCase();
}

export default function UploadPage() {
  const router = useRouter();
  const sections = useStudyStore((s) => s.sections);
  const addSections = useStudyStore((s) => s.addSections);
  const selectSection = useStudyStore((s) => s.selectSection);
  const setQuizForSection = useStudyStore((s) => s.setQuizForSection);
  const setPdfChunksForFile = useStudyStore((s) => s.setPdfChunksForFile);

  const [phase, setPhase] = React.useState<"idle" | "pdf" | "chunks" | "done" | "error">("idle");
  const [status, setStatus] = React.useState<string>("");
  const [progress, setProgress] = React.useState<{ i: number; n: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [preview, setPreview] = React.useState<StructureResult["sections"]>([]);
  const [legalPreview, setLegalPreview] = React.useState<{ definitions: string[]; rules: string[]; processes: string[] } | null>(null);
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
    setLegalPreview(null);
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

      const chunks = chunkText(text, 1600);
      setPhase("chunks");
      setStatus("Mapping document (cheap)…");

      // File hash: used for cross-refresh caching (server will cache per user+file_hash).
      const digest = await crypto.subtle.digest("SHA-256", buf);
      const fileHash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Cache all chunks locally so we can deep-process only what the user opens later.
      setPdfChunksForFile(fileHash, chunks);

      // Stage 1: sample 10–20% (cap) for the doc map call.
      const sampleCount = Math.max(4, Math.min(chunks.length, Math.ceil(chunks.length * 0.15)));
      const sampleText = chunks.slice(0, sampleCount).join("\n\n");

      setProgress({ i: 0, n: 1 });
      const res = await fetch("/api/document-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_hash: fileHash, sample_text: sampleText }),
      });
      const json = (await res.json()) as unknown;
      if (!res.ok || (json && typeof json === "object" && "error" in json)) {
        const err =
          json && typeof json === "object" && "error" in json && typeof (json as { error?: string }).error === "string"
            ? (json as { error: string }).error
            : `HTTP ${res.status}`;
        throw new Error(err);
      }

      const payload = json as {
        file_id: string;
        document_type: string;
        document_map: { sections: Array<{ id: string; title: string; description: string; keywords: string[] }> };
      };

      setLegalPreview(null);
      setPreview(
        payload.document_map.sections.map((s) => ({
          title: s.title,
          summary: s.description,
          concepts: s.keywords ?? [],
        })),
      );

      const chapterTitle = file.name.replace(/\.pdf$/i, "");
      const existingKeys = new Set(sections.map((s) => `${s.chapterTitle}::${normTitle(s.title)}`));
      const toAdd: StudySection[] = [];
      const titleToId: Record<string, string> = {};

      for (const s of payload.document_map.sections) {
        const key = `${chapterTitle}::${normTitle(s.title)}`;
        if (existingKeys.has(key)) continue;
        const id = crypto.randomUUID();
        titleToId[s.title] = id;
        toAdd.push({
          id,
          chapterNumber: 1,
          chapterTitle,
          title: s.title,
          extractedText: s.description ?? "",
          keyConcepts: (s.keywords ?? []).map((c) => c.trim()).filter(Boolean),
          sourceFileId: payload.file_id,
          sourceFileHash: fileHash,
          needsDeepProcessing: true,
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
        sectionId,
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

      {legalPreview ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/40">Key legal concepts</h2>
            <span className="text-xs text-ink/45">Definitions · Rules · Processes</span>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <GlassCard className="p-5">
              <div className="text-sm font-semibold text-ink">Definitions</div>
              <div className="mt-3 space-y-2 text-sm text-ink/70">
                {legalPreview.definitions.length ? (
                  legalPreview.definitions.map((d) => <div key={d}>- {d}</div>)
                ) : (
                  <div className="text-ink/50">None found.</div>
                )}
              </div>
            </GlassCard>
            <GlassCard className="p-5">
              <div className="text-sm font-semibold text-ink">Rules</div>
              <div className="mt-3 space-y-2 text-sm text-ink/70">
                {legalPreview.rules.length ? (
                  legalPreview.rules.map((r) => <div key={r}>- {r}</div>)
                ) : (
                  <div className="text-ink/50">None found.</div>
                )}
              </div>
            </GlassCard>
            <GlassCard className="p-5">
              <div className="text-sm font-semibold text-ink">Processes</div>
              <div className="mt-3 space-y-2 text-sm text-ink/70">
                {legalPreview.processes.length ? (
                  legalPreview.processes.map((p) => <div key={p}>- {p}</div>)
                ) : (
                  <div className="text-ink/50">None found.</div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      ) : preview.length ? (
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

