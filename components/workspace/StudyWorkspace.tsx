"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookMarked, GripVertical, Layers, Loader2, Sparkles } from "lucide-react";

import { FlashcardsTab } from "@/components/workspace/FlashcardsTab";
import { QuizTab } from "@/components/workspace/QuizTab";
import { StudyPdfMarkupViewer, type StudyPdfViewerHandle } from "@/components/workspace/StudyPdfMarkupViewer";
import { SupportMessageOverlay } from "@/components/workspace/SupportMessageOverlay";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { bumpStudyMinutesToday, loadLastStudy, saveLastStudy, updateLastStudyStickyCount } from "@/lib/lastStudySession";
import {
  createStickyNote,
  fetchStudyFlashcards,
  fetchStudyHighlights,
  fetchStudyQuizzes,
  getSummary,
  listStickyNotes,
  postCoach,
  postImprove,
  postStudyGenerate,
  postSummary,
  postUnit,
  studyApiConfigured,
  syncStudyHighlights,
  type CoachResponse,
  type PdfTextHighlightDto,
  type StickyNoteDto,
  type StudyFlashcardRead,
  type StudyHighlightRead,
  type StudyQuizQuestionRead,
} from "@/lib/studyApi";
import { selectionKeyHighlight } from "@/lib/annotations";
import { cn } from "@/lib/utils";
import { useEncouragementAudio } from "@/hooks/useEncouragementAudio";
import { useStudySupportMessages } from "@/hooks/useStudySupportMessages";
import { useAnnotationToolbarStore } from "@/stores/useAnnotationToolbarStore";

const PANEL_MIN = 280;
const PANEL_MAX = 560;
const DEBOUNCE_MS = 900;
const HIGHLIGHT_SYNC_MS = 850;
const MAX_SOURCE_CHARS = 50_000;

function stickyAnchorFromHighlight(hl: PdfTextHighlightDto): { page: number; x: number; y: number } {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const r of hl.rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { page: hl.page_number, x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

export function StudyWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const resumeHandledRef = React.useRef(false);
  const pdfViewerRef = React.useRef<StudyPdfViewerHandle>(null);

  const [localFile, setLocalFile] = React.useState<File | null>(null);
  const [unitId, setUnitId] = React.useState<string | null>(null);
  const [sourceText, setSourceText] = React.useState("");
  const [userSummary, setUserSummary] = React.useState("");
  const [summaryId, setSummaryId] = React.useState<string | null>(null);

  const [studyTab, setStudyTab] = React.useState<"reader" | "flashcards" | "quiz">("reader");
  const [liveHighlights, setLiveHighlights] = React.useState<PdfTextHighlightDto[]>([]);
  const [studyHighlights, setStudyHighlights] = React.useState<StudyHighlightRead[]>([]);
  const [serverFlashcards, setServerFlashcards] = React.useState<StudyFlashcardRead[]>([]);
  const [serverQuiz, setServerQuiz] = React.useState<StudyQuizQuestionRead[]>([]);

  const [panelActive, setPanelActive] = React.useState(false);
  const [panelWidth, setPanelWidth] = React.useState(380);
  const dragRef = React.useRef<{ startX: number; startW: number } | null>(null);

  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<CoachResponse | null>(null);
  const [feedbackVisible, setFeedbackVisible] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [stickyNotes, setStickyNotes] = React.useState<StickyNoteDto[]>([]);

  const encouragement = useEncouragementAudio();
  const prevStudyTabRef = React.useRef<"reader" | "flashcards" | "quiz">("reader");
  const encouragementArmedRef = React.useRef(false);

  const lastPdfExcerptRef = React.useRef("");

  const highlightsById = React.useMemo(() => {
    const m = new Map<string, StudyHighlightRead>();
    for (const h of studyHighlights) m.set(h.id, h);
    return m;
  }, [studyHighlights]);

  const refreshStudyMaterials = React.useCallback(async () => {
    if (!studyApiConfigured() || !unitId) return;
    try {
      const [hl, fc, qz] = await Promise.all([
        fetchStudyHighlights(unitId),
        fetchStudyFlashcards(unitId),
        fetchStudyQuizzes(unitId),
      ]);
      setStudyHighlights(hl);
      setServerFlashcards(fc);
      setServerQuiz(qz);
    } catch {
      /* ignore */
    }
  }, [unitId]);

  React.useEffect(() => {
    void refreshStudyMaterials();
  }, [refreshStudyMaterials]);

  const applyPdfSelection = React.useCallback((raw: string, force = false) => {
    const t = raw.replace(/\s+/g, " ").trim();
    if (!t) return;
    const capped = t.slice(0, MAX_SOURCE_CHARS);
    if (!force && capped === lastPdfExcerptRef.current) return;
    lastPdfExcerptRef.current = capped;
    setSourceText(capped);
    setPanelActive(true);
    setFeedback(null);
    setFeedbackVisible(false);
  }, []);

  React.useEffect(() => {
    if (!localFile) lastPdfExcerptRef.current = "";
  }, [localFile]);

  React.useEffect(() => {
    if (!studyApiConfigured() || !unitId) {
      setStickyNotes([]);
      return;
    }
    void listStickyNotes(unitId).then(setStickyNotes).catch(() => setStickyNotes([]));
  }, [unitId]);

  React.useEffect(() => {
    if (resumeHandledRef.current) return;
    if (searchParams.get("resume") !== "1") return;
    resumeHandledRef.current = true;
    const snap = loadLastStudy();
    if (snap?.unitId) setUnitId(snap.unitId);
    router.replace("/workspace");
  }, [router, searchParams]);

  React.useEffect(() => {
    if (unitId && localFile) {
      saveLastStudy({ unitId, pdfTitle: localFile.name.replace(/\.pdf$/i, "") || localFile.name });
    }
  }, [unitId, localFile]);

  React.useEffect(() => {
    if (unitId) updateLastStudyStickyCount(stickyNotes.length);
  }, [stickyNotes.length, unitId]);

  React.useEffect(() => {
    if (!studyApiConfigured()) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      bumpStudyMinutesToday(1);
    }, 180_000);
    return () => window.clearInterval(id);
  }, []);

  const highlightSyncTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (!studyApiConfigured() || !unitId) return;
    if (highlightSyncTimer.current) clearTimeout(highlightSyncTimer.current);
    highlightSyncTimer.current = setTimeout(() => {
      void syncStudyHighlights(unitId, liveHighlights)
        .then(setStudyHighlights)
        .catch(() => {});
    }, HIGHLIGHT_SYNC_MS);
    return () => {
      if (highlightSyncTimer.current) clearTimeout(highlightSyncTimer.current);
    };
  }, [unitId, liveHighlights]);

  const { toast: supportToast, dismissToast } = useStudySupportMessages(true);

  React.useEffect(() => {
    const prev = prevStudyTabRef.current;
    const isStudy = (t: "reader" | "flashcards" | "quiz") => t === "flashcards" || t === "quiz";

    const leftForReader = studyTab === "reader" && isStudy(prev);
    const switchedDeck = isStudy(prev) && isStudy(studyTab) && prev !== studyTab;
    if ((leftForReader || switchedDeck) && encouragementArmedRef.current) {
      void encouragement.playAfter();
      encouragementArmedRef.current = false;
    }

    prevStudyTabRef.current = studyTab;
  }, [studyTab, encouragement]);

  React.useEffect(() => {
    if (studyTab !== "flashcards" && studyTab !== "quiz") return;
    const has =
      (studyTab === "flashcards" && serverFlashcards.length > 0) ||
      (studyTab === "quiz" && serverQuiz.length > 0);
    if (!has) return;
    if (encouragementArmedRef.current) return;
    void encouragement.playBefore();
    encouragementArmedRef.current = true;
  }, [studyTab, serverFlashcards.length, serverQuiz.length, encouragement]);

  const appendStickyToSummary = React.useCallback((text: string) => {
    const block = text.trim();
    if (!block) return;
    setUserSummary((s) => (s.trim() ? `${s.trim()}\n\n— Sticky —\n${block}` : block));
  }, []);

  const appendStickyToExcerpt = React.useCallback((text: string) => {
    const block = text.trim();
    if (!block) return;
    setSourceText((s) => {
      const next = s.trim() ? `${s.trim()}\n\n— Sticky —\n${block}` : block;
      return next.slice(0, MAX_SOURCE_CHARS);
    });
    setPanelActive(true);
    setFeedback(null);
    setFeedbackVisible(false);
  }, []);

  const onPointerMove = React.useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = d.startX - e.clientX;
    setPanelWidth(() => Math.min(PANEL_MAX, Math.max(PANEL_MIN, d.startW + dx)));
  }, []);

  const onPointerUp = React.useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: panelWidth };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const captureSelectionManual = React.useCallback(() => {
    const t = window.getSelection()?.toString().replace(/\s+/g, " ").trim() ?? "";
    if (t) applyPdfSelection(t, true);
  }, [applyPdfSelection]);

  const onPickPdf = async (file: File | null) => {
    if (!file || file.type !== "application/pdf") return;
    useAnnotationToolbarStore.getState().setTool("select");
    setLocalFile(file);
    setSaveError(null);
    setUnitId(null);
    setSummaryId(null);
    setSourceText("");
    lastPdfExcerptRef.current = "";
    setUserSummary("");
    setFeedback(null);
    setFeedbackVisible(false);
    setLiveHighlights([]);
    setStudyHighlights([]);
    setServerFlashcards([]);
    setServerQuiz([]);
    setStudyTab("reader");
    if (!studyApiConfigured()) return;
    try {
      setBusy("upload");
      const u = await postUnit(file, file.name.replace(/\.pdf$/i, ""));
      setUnitId(u.id);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!studyApiConfigured() || !unitId) return;
    if (!sourceText.trim() || !userSummary.trim()) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      setSaveError(null);
      try {
        const row = await postSummary({
          id: summaryId ?? undefined,
          unit_id: unitId,
          source_text: sourceText.trim(),
          user_summary: userSummary.trim(),
        });
        setSummaryId(row.id);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1500);
      } catch (e) {
        setSaveStatus("error");
        setSaveError(e instanceof Error ? e.message : "Save failed");
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [unitId, sourceText, userSummary, summaryId]);

  const refreshFeedbackFromCache = React.useCallback(async (idOverride?: string) => {
    const sid = idOverride ?? summaryId;
    if (!sid || !studyApiConfigured()) return;
    try {
      const row = await getSummary(sid);
      if (row.ai_feedback && typeof row.ai_feedback === "object") {
        const f = row.ai_feedback as Record<string, unknown>;
        setFeedback({
          missing_concepts: Array.isArray(f.missing_concepts) ? (f.missing_concepts as string[]) : [],
          unclear_points: Array.isArray(f.unclear_points) ? (f.unclear_points as string[]) : [],
          improvement_suggestions: Array.isArray(f.improvement_suggestions)
            ? (f.improvement_suggestions as string[])
            : [],
        });
        setFeedbackVisible(true);
      }
    } catch {
      /* ignore */
    }
  }, [summaryId]);

  React.useEffect(() => {
    void refreshFeedbackFromCache();
  }, [summaryId, refreshFeedbackFromCache]);

  const flushSummary = React.useCallback(async (): Promise<string | null> => {
    if (!unitId || !sourceText.trim() || !userSummary.trim()) return summaryId;
    const row = await postSummary({
      id: summaryId ?? undefined,
      unit_id: unitId,
      source_text: sourceText.trim(),
      user_summary: userSummary.trim(),
    });
    setSummaryId(row.id);
    return row.id;
  }, [unitId, sourceText, userSummary, summaryId]);

  const onCoach = async () => {
    if (!userSummary.trim() || !sourceText.trim()) return;
    if (!studyApiConfigured()) return;
    setBusy("coach");
    setSaveError(null);
    try {
      const sid = (await flushSummary()) ?? undefined;
      const res = await postCoach({
        source_text: sourceText.trim(),
        user_summary: userSummary.trim(),
        summary_id: sid,
      });
      setFeedback(res);
      setFeedbackVisible(true);
      if (sid) void refreshFeedbackFromCache(sid);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Coach request failed");
    } finally {
      setBusy(null);
    }
  };

  const onImprove = async () => {
    if (!userSummary.trim() || !feedback) return;
    if (!studyApiConfigured()) return;
    setBusy("improve");
    setSaveError(null);
    try {
      const { improved_summary } = await postImprove({
        user_summary: userSummary.trim(),
        ai_feedback: { ...feedback },
      });
      setUserSummary(improved_summary);
      setFeedback(null);
      setFeedbackVisible(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Improve failed");
    } finally {
      setBusy(null);
    }
  };

  const runGenerateStudyAids = async (modes: ("flashcards" | "quiz")[], highlightIds?: string[]) => {
    if (!studyApiConfigured() || !unitId) return;
    if (!liveHighlights.length) {
      setSaveError("Highlight at least one passage before generating study aids.");
      return;
    }
    setBusy("gen");
    setSaveError(null);
    try {
      await syncStudyHighlights(unitId, liveHighlights);
      await postStudyGenerate({
        unit_id: unitId,
        modes,
        highlight_ids: highlightIds ?? null,
        force: Boolean(highlightIds?.length),
      });
      await refreshStudyMaterials();
      if (modes.includes("flashcards")) setStudyTab("flashcards");
      else if (modes.includes("quiz")) setStudyTab("quiz");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(null);
    }
  };

  const openSource = React.useCallback((page: number, highlightId: string | null) => {
    setStudyTab("reader");
    window.requestAnimationFrame(() => {
      pdfViewerRef.current?.scrollToPage(page);
      if (highlightId) useAnnotationToolbarStore.getState().setSelectedAnnotation(selectionKeyHighlight(highlightId));
    });
  }, []);

  const configured = studyApiConfigured();
  const canCoach = configured && sourceText.trim().length > 0 && userSummary.trim().length > 0;
  const summaryReady = userSummary.trim().length > 0;

  const lastSnap = loadLastStudy();
  const showResumeHint = configured && !!unitId && !localFile;

  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col gap-3 lg:min-h-[calc(100dvh-6rem)]">
      {showResumeHint ? (
        <div className="rounded-xl border border-copper/25 bg-rose-light/40 px-4 py-3 text-sm text-ink shadow-sm backdrop-blur-sm">
          <span className="font-medium">Resume session:</span> open the same PDF file to reconnect markup and the viewer
          {lastSnap?.pdfTitle ? (
            <>
              {" "}
              (<span className="italic">{lastSnap.pdfTitle}</span>)
            </>
          ) : null}
          .
        </div>
      ) : null}
      {!configured ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          Set <code className="rounded bg-white/80 px-1">NEXT_PUBLIC_STUDY_API_URL</code> to your FastAPI base URL
          (e.g. <code className="rounded bg-white/80 px-1">http://127.0.0.1:8000</code>), then restart Next.js.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            void onPickPdf(f);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
          Open PDF
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="gap-1.5 border-copper/20 bg-white shadow-sm"
          disabled={!configured || !unitId || busy !== null || liveHighlights.length < 1}
          onClick={() => void runGenerateStudyAids(["flashcards", "quiz"])}
        >
          {busy === "gen" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4 text-copper" />}
          Generate study aids
        </Button>
        {localFile ? (
          <span className="text-xs text-ink-muted">
            {localFile.name}
            {unitId ? " · synced" : busy === "upload" ? " · uploading…" : ""}
          </span>
        ) : (
          <span className="text-xs text-ink-muted">A PDF is one Unit on the server.</span>
        )}
        {liveHighlights.length > 0 ? (
          <span className="rounded-full bg-copper/10 px-2 py-0.5 text-[11px] font-medium text-copper">
            {liveHighlights.length} highlight{liveHighlights.length === 1 ? "" : "s"}
          </span>
        ) : null}
        {saveStatus === "saving" ? (
          <span className="flex items-center gap-1 text-xs text-ink-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        ) : saveStatus === "saved" ? (
          <span className="text-xs text-emerald-700">Saved</span>
        ) : null}
        {saveError ? <span className="text-xs text-red-700">{saveError}</span> : null}
      </div>

      <Tabs
        value={studyTab}
        onValueChange={(v) => setStudyTab(v as "reader" | "flashcards" | "quiz")}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList className="w-full shrink-0 justify-start sm:w-auto">
          <TabsTrigger value="reader">Reader</TabsTrigger>
          <TabsTrigger value="flashcards">
            Flashcards
            {serverFlashcards.length > 0 ? (
              <span className="ml-1.5 rounded-full bg-copper/15 px-1.5 py-px text-[10px] font-semibold tabular-nums text-copper">
                {serverFlashcards.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="quiz">
            Quiz
            {serverQuiz.length > 0 ? (
              <span className="ml-1.5 rounded-full bg-copper/15 px-1.5 py-px text-[10px] font-semibold tabular-nums text-copper">
                {serverQuiz.length}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reader" className="mt-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <div
            className="flex min-h-[42dvh] min-w-0 flex-1 flex-col overflow-hidden border border-[rgba(120,90,80,0.1)] lg:min-h-0 lg:rounded-l-2xl lg:border-r-0 lg:bg-surface-panel/40"
            style={{ minHeight: 480 }}
          >
            {localFile ? (
              <StudyPdfMarkupViewer
                ref={pdfViewerRef}
                file={localFile}
                unitId={unitId}
                stickyNotes={stickyNotes}
                onStickyNotesChange={setStickyNotes}
                onExcerpt={applyPdfSelection}
                onHighlightsChange={setLiveHighlights}
                highlightActions={
                  configured && unitId
                    ? {
                        onFlashcards: (hl: PdfTextHighlightDto) => void runGenerateStudyAids(["flashcards"], [hl.id]),
                        onQuiz: (hl: PdfTextHighlightDto) => void runGenerateStudyAids(["quiz"], [hl.id]),
                        onNote: async (hl: PdfTextHighlightDto) => {
                          const { page, x, y } = stickyAnchorFromHighlight(hl);
                          try {
                            const row = await createStickyNote(unitId, {
                              page_number: page,
                              x_position: x,
                              y_position: y,
                              content: "",
                            });
                            setStickyNotes((prev) => [...prev, row]);
                          } catch {
                            setSaveError("Could not create sticky note.");
                          }
                        },
                      }
                    : undefined
                }
              />
            ) : (
              <div className="flex h-full min-h-[42dvh] items-center justify-center text-sm text-ink-muted">
                Open a PDF to start.
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label="Resize panel"
            onPointerDown={startDrag}
            className="hidden h-auto w-3 shrink-0 cursor-col-resize items-center justify-center border-y border-[rgba(120,90,80,0.08)] bg-black/[0.02] hover:bg-rose-light/30 lg:flex"
          >
            <GripVertical className="h-4 w-4 text-ink-muted" />
          </button>

          <ScrollArea
            className="w-full shrink-0 border border-t-0 border-[rgba(120,90,80,0.1)] bg-[rgba(251,248,244,0.65)] lg:max-w-[min(100%,560px)] lg:rounded-r-2xl lg:border-l-0 lg:border-t"
            style={{ width: `min(100%, ${panelWidth}px)` }}
          >
            <div className="space-y-5 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  <BookMarked className="h-4 w-4 text-copper" strokeWidth={1.5} />
                  Study panel
                </div>
                {panelActive ? (
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-700">
                    Excerpt linked
                  </span>
                ) : (
                  <span className="text-[10px] text-ink-muted">Highlight the PDF</span>
                )}
              </div>

              <p className="text-[11px] leading-relaxed text-ink-muted">
                Highlights are saved for AI recall. Use{" "}
                <span className="font-medium text-ink-secondary">Generate study aids</span> to build flashcards and quizzes
                from highlighted text only — never the full PDF.
              </p>

              <p className="text-[11px] leading-relaxed text-ink-muted">
                Need an excerpt for the coach?{" "}
                <button
                  type="button"
                  className="font-medium text-rose-deep underline decoration-rose-deep/40 underline-offset-2 hover:decoration-rose-deep"
                  disabled={!localFile}
                  onClick={captureSelectionManual}
                >
                  Capture selection manually
                </button>
                .
              </p>

              {sourceText ? (
                <div className="rounded-lg border border-[rgba(120,90,80,0.1)] bg-white/60 p-3 text-xs text-ink-secondary">
                  <div className="font-medium text-ink-muted">Source excerpt</div>
                  <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">{sourceText}</p>
                </div>
              ) : null}

              {stickyNotes.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">Sticky notes</div>
                  <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
                    {stickyNotes.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-lg border border-[rgba(120,90,80,0.1)] bg-white/70 p-2.5 text-xs shadow-sm"
                      >
                        <div className="text-[10px] text-ink-muted">
                          Page {n.page_number}
                          {n.content.trim() ? null : " · empty"}
                        </div>
                        <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-ink-secondary">{n.content || "—"}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="h-7 text-[11px]"
                            disabled={!n.content.trim()}
                            onClick={() => appendStickyToSummary(n.content)}
                          >
                            Insert into summary
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px]"
                            disabled={!n.content.trim()}
                            onClick={() => appendStickyToExcerpt(n.content)}
                          >
                            Add to excerpt
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">Your summary</label>
                <Textarea
                  value={userSummary}
                  onChange={(e) => setUserSummary(e.target.value)}
                  placeholder="Optional — write your summary for grounded coach feedback…"
                  className={cn(
                    "mt-2 min-h-[140px] resize-y border-[rgba(120,90,80,0.12)] bg-white/80 text-sm",
                    "focus-visible:ring-copper/30",
                  )}
                />
                <p className="mt-1 text-[11px] text-ink-muted">Auto-saves when excerpt + summary are both non-empty.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!canCoach || busy !== null}
                  onClick={() => void onCoach()}
                >
                  {busy === "coach" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Get feedback
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!feedback || !summaryReady || busy !== null}
                  onClick={() => void onImprove()}
                >
                  {busy === "improve" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Improve summary
                </Button>
              </div>

              {feedback && feedbackVisible ? (
                <div className="space-y-3 rounded-xl border border-[rgba(120,90,80,0.1)] bg-white/70 p-4 text-sm shadow-warm">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">AI feedback</div>
                  <FeedbackBlock title="Missing concepts" items={feedback.missing_concepts} />
                  <FeedbackBlock title="Unclear points" items={feedback.unclear_points} />
                  <FeedbackBlock title="Suggestions" items={feedback.improvement_suggestions} />
                </div>
              ) : null}

              <p className="border-t border-[rgba(120,90,80,0.08)] pt-4 text-[10px] leading-relaxed text-ink-muted">
                Flashcards and quizzes use your <span className="font-medium text-ink-secondary">highlight excerpts</span>{" "}
                via the FastAPI <code className="rounded bg-white/80 px-1">/api/study/generate</code> pipeline — not full-document chunks.
              </p>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="flashcards"
          className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-[rgba(120,90,80,0.08)] bg-white/90 px-3 py-8 shadow-[0_12px_48px_rgba(40,30,20,0.05)]"
        >
          <FlashcardsTab
            cards={serverFlashcards}
            highlightsById={highlightsById}
            onOpenSource={(page, hid) => openSource(page, hid)}
            emptyHint={
              configured && unitId
                ? "Generate study aids from your highlights to populate this deck. AI only sees highlighted passages."
                : "Open a PDF and add highlights to generate flashcards."
            }
          />
        </TabsContent>

        <TabsContent
          value="quiz"
          className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-[rgba(120,90,80,0.08)] bg-white/90 px-3 py-8 shadow-[0_12px_48px_rgba(40,30,20,0.05)]"
        >
          <QuizTab
            questions={serverQuiz}
            highlightsById={highlightsById}
            onOpenSource={(page, hid) => openSource(page, hid)}
            emptyHint={
              configured && unitId
                ? "Generate study aids to build a mixed quiz (MCQ, true/false, short answer) grounded in highlights."
                : "Open a PDF and highlight key passages first."
            }
          />
        </TabsContent>
      </Tabs>

      {busy === "upload" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <Loader2 className="h-8 w-8 animate-spin text-copper" />
        </div>
      ) : null}

      {supportToast ? <SupportMessageOverlay message={supportToast} onDismiss={dismissToast} /> : null}
    </div>
  );
}

function FeedbackBlock({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">{title}</div>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-ink/85">
        {items.map((x, i) => (
          <li key={`${i}-${x.slice(0, 48)}`}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
