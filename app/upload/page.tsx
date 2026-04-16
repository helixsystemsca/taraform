"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { chunkText } from "@/lib/chunk";
import { extractPdfTextFromArrayBuffer } from "@/lib/extractPdfText";
import { mergeStructureChunks } from "@/lib/mergeSections";
import type { QuizResult, StructureResult } from "@/lib/openai";
import { cn } from "@/lib/utils";

function sectionToQuizContent(s: StructureResult["sections"][number]): string {
  const lines = [
    `Title: ${s.title}`,
    s.summary ? `Summary: ${s.summary}` : null,
    s.concepts?.length ? `Concepts:\n${s.concepts.map((c) => `- ${c}`).join("\n")}` : null,
  ].filter(Boolean);
  return lines.join("\n\n");
}

export default function UploadPage() {
  const [busy, setBusy] = React.useState(false);
  const [log, setLog] = React.useState<string[]>([]);
  const [sections, setSections] = React.useState<StructureResult["sections"]>([]);
  const [quizzes, setQuizzes] = React.useState<Record<string, QuizResult | null>>({});
  const [quizBusy, setQuizBusy] = React.useState<Record<string, boolean>>({});

  function pushLog(line: string) {
    console.log(line);
    setLog((prev) => [...prev, line]);
  }

  async function onFile(file: File | null) {
    if (!file || file.type !== "application/pdf") {
      pushLog("Please choose a PDF file.");
      return;
    }
    setBusy(true);
    setSections([]);
    setQuizzes({});
    setLog([]);
    try {
      pushLog(`Reading PDF: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      const buf = await file.arrayBuffer();
      const text = await extractPdfTextFromArrayBuffer(buf);
      if (!text) {
        pushLog("No text extracted from PDF.");
        return;
      }
      pushLog(`Extracted ${text.length} characters.`);

      const chunks = chunkText(text, 2000);
      pushLog(`Split into ${chunks.length} chunk(s), max 2000 chars each.`);

      const perChunk: StructureResult[] = [];
      for (let c = 0; c < chunks.length; c++) {
        pushLog(`Calling /api/generate-structure for chunk ${c + 1}/${chunks.length}…`);
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
        pushLog(`Chunk ${c + 1}: ${structure.sections?.length ?? 0} section(s) returned.`);
      }

      const merged = mergeStructureChunks(perChunk);
      pushLog(`Merged: ${merged.sections.length} unique section(s) by title.`);
      setSections(merged.sections);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      pushLog(`Error: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function generateQuizForSection(title: string, section: StructureResult["sections"][number]) {
    setQuizBusy((b) => ({ ...b, [title]: true }));
    try {
      const content = sectionToQuizContent(section);
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = (await res.json()) as unknown;
      if (!res.ok || (json && typeof json === "object" && "error" in json)) {
        const err =
          json && typeof json === "object" && "error" in json && typeof (json as { error?: string }).error === "string"
            ? (json as { error: string }).error
            : `HTTP ${res.status}`;
        throw new Error(err);
      }
      setQuizzes((q) => ({ ...q, [title]: json as QuizResult }));
      pushLog(`Quiz generated for: ${title}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      setQuizzes((q) => ({ ...q, [title]: null }));
      pushLog(`Quiz error (${title}): ${msg}`);
    } finally {
      setQuizBusy((b) => ({ ...b, [title]: false }));
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-ink">PDF → lesson</h1>
      <p className="mt-2 text-sm text-ink/55">Upload a PDF. Text is chunked; each chunk calls the structure API.</p>

      <div className="mt-6">
        <input
          type="file"
          accept="application/pdf"
          disabled={busy}
          className="block w-full text-sm text-ink/70 file:mr-4 file:rounded-xl file:border-0 file:bg-blush-medium/70 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            void onFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {log.length ? (
        <pre
          className={cn(
            "mt-6 max-h-48 overflow-auto rounded-2xl border border-stone-200/70 bg-white/60 p-4 text-xs text-ink/70",
          )}
        >
          {log.join("\n")}
        </pre>
      ) : null}

      {sections.length ? (
        <div className="mt-8 space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/40">Sections</h2>
          {sections.map((s) => (
            <article
              key={s.title}
              className="rounded-2xl border border-stone-200/70 bg-white/70 p-5 shadow-sm shadow-stone-900/5"
            >
              <h3 className="font-display text-lg font-semibold text-ink">{s.title}</h3>
              {s.summary ? <p className="mt-2 text-sm text-ink/65">{s.summary}</p> : null}
              {s.concepts?.length ? (
                <ul className="mt-3 list-inside list-disc text-sm text-ink/75">
                  {s.concepts.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!!quizBusy[s.title]}
                  onClick={() => void generateQuizForSection(s.title, s)}
                >
                  {quizBusy[s.title] ? "Generating…" : "Generate quiz"}
                </Button>
              </div>
              {quizzes[s.title]?.questions?.length ? (
                <ol className="mt-4 space-y-4 border-t border-stone-200/60 pt-4 text-sm">
                  {quizzes[s.title]!.questions.map((q, qi) => (
                    <li key={qi} className="text-ink/80">
                      <div className="font-medium text-ink">{q.question}</div>
                      <ul className="mt-2 space-y-1">
                        {q.choices.map((ch, ci) => (
                          <li
                            key={ci}
                            className={cn(
                              "rounded-lg px-2 py-1",
                              ci === q.correctIndex ? "bg-emerald-50 text-emerald-900" : "text-ink/70",
                            )}
                          >
                            {ch}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-ink/55">{q.explanation}</p>
                    </li>
                  ))}
                </ol>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
