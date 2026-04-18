"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2, Sparkles, UploadCloud } from "lucide-react";

import { extractTextbookFromImage } from "@/app/actions/extractTextbookFromImage";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassFAB } from "@/components/glass/GlassFAB";
import { StudyPlanPanel } from "@/components/taraform/StudyPlanPanel";
import { VoiceEncouragementButton } from "@/components/taraform/VoiceEncouragementButton";
import { Button } from "@/components/ui/button";
import { mapExtractionToSections } from "@/lib/mapExtractionToSections";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/useStudyStore";

export function Dashboard() {
  const router = useRouter();
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
      <GlassCard className="relative overflow-hidden p-7 sm:p-9">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-rose-light/30 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(120,90,80,0.1)] bg-rose-light/45 px-3 py-1.5 text-xs font-medium text-ink-secondary">
              <Sparkles className="h-3.5 w-3.5 text-copper" />
              For Tara — nursing grad school
            </div>
            <h2 className="font-display text-3xl font-medium tracking-[-0.03em] text-ink sm:text-4xl">
              Your calm study library
            </h2>
            <p className="text-[15px] leading-relaxed text-ink-secondary">
              Upload a scanned textbook page. We extract only what’s visible, then you can take notes, build NCLEX-style
              quizzes, and watch your confidence grow.
            </p>
            <p className="text-sm text-ink-secondary">
              <Link
                href="/workspace"
                className="font-medium text-rose-deep underline-offset-2 hover:underline"
              >
                Open study workspace (PDF units & coach)
              </Link>
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
        <GlassCard className="border border-red-200/80 bg-[rgba(254,242,242,0.92)] p-5 text-red-900">
          <div className="text-sm font-medium">Something went wrong</div>
          <p className="mt-1 text-sm text-red-800/90">{error}</p>
        </GlassCard>
      ) : null}

      {sections.length > 0 ? <StudyPlanPanel /> : null}

      {sections.length === 0 && !uploadBusy ? (
        <GlassCard className="flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[rgba(120,90,80,0.1)] bg-rose-light/40">
            <BookOpen className="h-7 w-7 text-copper" strokeWidth={1.5} />
          </div>
          <div>
            <div className="font-display text-xl font-medium text-ink">No sections yet</div>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">
              Upload your first scanned page — we’ll detect chapters and drop each section here as a glass card you can
              open anytime.
            </p>
          </div>
        </GlassCard>
      ) : null}

      {sections.length > 0 ? (
        <div>
          <div className="mb-4 flex items-center justify-between gap-2 px-1">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">Sections</h3>
            <span className="text-xs font-medium text-ink-secondary">{sections.length} saved</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  selectSection(s.id);
                  router.push("/study");
                }}
                className={cn(
                  "rounded-xl border border-[rgba(120,90,80,0.08)] bg-surface-panel p-6 text-left text-ink shadow-warm transition-editorial",
                  "hover:-translate-y-0.5 hover:border-[rgba(120,90,80,0.12)] hover:bg-[rgba(232,214,214,0.22)] hover:shadow-warm-hover active:scale-[0.995]",
                )}
              >
                <div className="text-xs font-medium text-copper">
                  Chapter {s.chapterNumber}
                  {s.pageNumber ? ` · ~p. ${s.pageNumber}` : ""}
                </div>
                <div className="mt-2 line-clamp-2 font-display text-base font-medium tracking-[-0.02em] text-ink">{s.title}</div>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-secondary">{s.extractedText || "—"}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(s.keyConcepts ?? []).slice(0, 4).map((k) => (
                    <span
                      key={k}
                      className="rounded-full border border-[rgba(120,90,80,0.1)] bg-rose-light/40 px-2.5 py-0.5 text-[11px] text-ink-secondary"
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
