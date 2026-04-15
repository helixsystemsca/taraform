"use client";

import * as React from "react";
import { BookOpen, Loader2, Sparkles, UploadCloud } from "lucide-react";

import { extractTextbookFromImage } from "@/app/actions/extractTextbookFromImage";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassFAB } from "@/components/glass/GlassFAB";
import { VoiceEncouragementButton } from "@/components/taraform/VoiceEncouragementButton";
import { Button } from "@/components/ui/button";
import { mapExtractionToSections } from "@/lib/mapExtractionToSections";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/useStudyStore";

export function Dashboard() {
  const sections = useStudyStore((s) => s.sections);
  const addSections = useStudyStore((s) => s.addSections);
  const selectSection = useStudyStore((s) => s.selectSection);
  const setUploadBusy = useStudyStore((s) => s.setUploadBusy);
  const uploadBusy = useStudyStore((s) => s.uploadBusy);

  const [error, setError] = React.useState<string | null>(null);

  async function onPickFile(file: File) {
    setError(null);
    setUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await extractTextbookFromImage(formData);
      const mapped = mapExtractionToSections(result.doc);
      if (mapped.length === 0) {
        setError("No readable sections were found on this page.");
        return;
      }
      addSections(mapped);
      selectSection(mapped[0]!.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <GlassCard className="relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-emerald-100/90 ring-1 ring-white/12">
              <Sparkles className="h-3.5 w-3.5" />
              For Tara — nursing grad school
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              Your calm study library
            </h2>
            <p className="text-[15px] leading-relaxed text-white/65">
              Upload a scanned textbook page. We extract only what’s visible, then you can take notes, build NCLEX-style
              quizzes, and watch your confidence grow.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <VoiceEncouragementButton />
            <div>
              <input
                id="taraform-dash-upload"
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploadBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onPickFile(f);
                  e.target.value = "";
                }}
              />
              <label htmlFor="taraform-dash-upload" className="inline-flex cursor-pointer">
                <Button variant="primary" size="lg" disabled={uploadBusy} asChild>
                  <span>
                    {uploadBusy ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-5 w-5" />
                        Upload scanned page
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </div>
      </GlassCard>

      {error ? (
        <GlassCard className="border border-red-300/25 bg-red-500/10 p-5">
          <div className="text-sm font-medium text-red-100">Something went wrong</div>
          <p className="mt-1 text-sm text-red-100/80">{error}</p>
        </GlassCard>
      ) : null}

      {sections.length === 0 && !uploadBusy ? (
        <GlassCard className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/8 ring-1 ring-white/15">
            <BookOpen className="h-7 w-7 text-sky-200/90" />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">No sections yet</div>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
              Upload your first scanned page — we’ll detect chapters and drop each section here as a glass card you can
              open anytime.
            </p>
          </div>
        </GlassCard>
      ) : null}

      {sections.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/45">Sections</h3>
            <span className="text-xs text-white/40">{sections.length} saved</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSection(s.id)}
                className={cn(
                  "glass text-left transition active:scale-[0.99]",
                  "rounded-3xl p-5 ring-1 ring-white/12 hover:bg-white/8 hover:ring-white/18",
                )}
              >
                <div className="text-xs font-medium text-emerald-200/85">
                  Chapter {s.chapterNumber}
                  {s.pageNumber ? ` · ~p. ${s.pageNumber}` : ""}
                </div>
                <div className="mt-2 line-clamp-2 text-base font-semibold tracking-[-0.02em] text-white">{s.title}</div>
                <p className="mt-2 line-clamp-2 text-sm text-white/55">{s.extractedText || "—"}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(s.keyConcepts ?? []).slice(0, 4).map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] text-white/70 ring-1 ring-white/10"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <GlassFAB
        label="Upload scanned textbook page"
        disabled={uploadBusy}
        inputProps={{
          accept: "image/*",
          disabled: uploadBusy,
          onChange: (e) => {
            const f = e.target.files?.[0];
            if (f) void onPickFile(f);
            e.target.value = "";
          },
        }}
      />
    </div>
  );
}
