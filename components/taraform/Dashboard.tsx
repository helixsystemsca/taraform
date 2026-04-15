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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blush-dust/25 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-copper/20 bg-blush-medium/70 px-3 py-1 text-xs font-medium text-ink/80">
              <Sparkles className="h-3.5 w-3.5 text-copper" />
              For Tara — nursing grad school
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
              Your calm study library
            </h2>
            <p className="text-[15px] leading-relaxed text-ink/60">
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
        <GlassCard className="border border-red-200 bg-red-50/90 p-5 text-red-900">
          <div className="text-sm font-medium">Something went wrong</div>
          <p className="mt-1 text-sm text-red-800/90">{error}</p>
        </GlassCard>
      ) : null}

      {sections.length === 0 && !uploadBusy ? (
        <GlassCard className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-200/60 bg-blush-medium/60">
            <BookOpen className="h-7 w-7 text-copper" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold text-ink">No sections yet</div>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">
              Upload your first scanned page — we’ll detect chapters and drop each section here as a glass card you can
              open anytime.
            </p>
          </div>
        </GlassCard>
      ) : null}

      {sections.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/40">Sections</h3>
            <span className="text-xs text-ink/45">{sections.length} saved</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSection(s.id)}
                className={cn(
                  "glass text-left text-ink transition active:scale-[0.99]",
                  "rounded-[1.75rem] p-5 hover:border-blush-dust/50 hover:bg-blush-sheet/90",
                )}
              >
                <div className="text-xs font-medium text-copper">
                  Chapter {s.chapterNumber}
                  {s.pageNumber ? ` · ~p. ${s.pageNumber}` : ""}
                </div>
                <div className="mt-2 line-clamp-2 text-base font-semibold tracking-[-0.02em] text-ink">{s.title}</div>
                <p className="mt-2 line-clamp-2 text-sm text-ink/55">{s.extractedText || "—"}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(s.keyConcepts ?? []).slice(0, 4).map((k) => (
                    <span
                      key={k}
                      className="rounded-full border border-copper/20 bg-blush-medium/60 px-2.5 py-0.5 text-[11px] text-ink/70"
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
