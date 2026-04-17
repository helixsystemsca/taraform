"use client";

import * as React from "react";
import { BookMarked, GripVertical, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  getSummary,
  postCoach,
  postFlashcardsStub,
  postImprove,
  postQuizStub,
  postSummary,
  postUnit,
  studyApiConfigured,
  type CoachResponse,
} from "@/lib/studyApi";
import { cn } from "@/lib/utils";

const PANEL_MIN = 280;
const PANEL_MAX = 560;
const DEBOUNCE_MS = 900;

function readIframeSelection(iframe: HTMLIFrameElement | null): string {
  if (!iframe?.contentWindow) return "";
  try {
    const sel = iframe.contentWindow.getSelection?.();
    return sel?.toString().trim() ?? "";
  } catch {
    return "";
  }
}

export function StudyWorkspace() {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [localFile, setLocalFile] = React.useState<File | null>(null);
  const [unitId, setUnitId] = React.useState<string | null>(null);
  const [sourceText, setSourceText] = React.useState("");
  const [userSummary, setUserSummary] = React.useState("");
  const [summaryId, setSummaryId] = React.useState<string | null>(null);

  const [panelActive, setPanelActive] = React.useState(false);
  const [panelWidth, setPanelWidth] = React.useState(380);
  const dragRef = React.useRef<{ startX: number; startW: number } | null>(null);

  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<CoachResponse | null>(null);
  const [feedbackVisible, setFeedbackVisible] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

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

  const captureSelection = React.useCallback(() => {
    const t = readIframeSelection(iframeRef.current);
    if (t) {
      setSourceText(t);
      setPanelActive(true);
      setFeedback(null);
      setFeedbackVisible(false);
    }
  }, []);

  const onPickPdf = async (file: File | null) => {
    if (!file || file.type !== "application/pdf") return;
    setLocalFile(file);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setUnitId(null);
    setSummaryId(null);
    setSourceText("");
    setUserSummary("");
    setFeedback(null);
    setFeedbackVisible(false);
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

  const onStub = async (kind: "fc" | "quiz") => {
    if (!studyApiConfigured()) return;
    setBusy(kind);
    try {
      const res = kind === "fc" ? await postFlashcardsStub() : await postQuizStub();
      window.alert(`${res.status}: ${res.message}`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(null);
    }
  };

  const configured = studyApiConfigured();
  const canCoach = configured && sourceText.trim().length > 0 && userSummary.trim().length > 0;
  const summaryReady = userSummary.trim().length > 0;

  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col gap-3 lg:min-h-[calc(100dvh-6rem)]">
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
        {localFile ? (
          <span className="text-xs text-ink-muted">
            {localFile.name}
            {unitId ? " · synced" : configured ? " · uploading…" : ""}
          </span>
        ) : (
          <span className="text-xs text-ink-muted">A PDF is one Unit on the server.</span>
        )}
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

      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[rgba(120,90,80,0.1)] bg-surface-panel/40 lg:flex-row"
        style={{ minHeight: 480 }}
      >
        <div className="relative min-h-[42dvh] min-w-0 flex-1 border-b border-[rgba(120,90,80,0.08)] lg:border-b-0 lg:border-r-0">
          {pdfUrl ? (
            <iframe
              ref={iframeRef}
              title="PDF"
              src={pdfUrl}
              className="h-full min-h-[42dvh] w-full bg-white"
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
          className="w-full shrink-0 border-t border-[rgba(120,90,80,0.08)] bg-[rgba(251,248,244,0.65)] lg:border-t-0 lg:border-l lg:border-[rgba(120,90,80,0.08)]"
          style={{ width: `min(100%, ${panelWidth}px)` }}
        >
          <div className="space-y-5 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <BookMarked className="h-4 w-4 text-copper" strokeWidth={1.5} />
                Study panel
              </div>
              {panelActive ? (
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-700">Active</span>
              ) : (
                <span className="text-[10px] text-ink-muted">Select text in the PDF</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="default" size="sm" disabled={!pdfUrl} onClick={captureSelection}>
                Use selection
              </Button>
              <span className="self-center text-[11px] text-ink-muted">Highlight in the PDF, then click.</span>
            </div>

            {sourceText ? (
              <div className="rounded-lg border border-[rgba(120,90,80,0.1)] bg-white/60 p-3 text-xs text-ink-secondary">
                <div className="font-medium text-ink-muted">Source excerpt</div>
                <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">{sourceText}</p>
              </div>
            ) : null}

            <div>
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">Your summary</label>
              <Textarea
                value={userSummary}
                onChange={(e) => setUserSummary(e.target.value)}
                placeholder="Write your own summary before asking the coach…"
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

            <div className="flex flex-wrap gap-2 border-t border-[rgba(120,90,80,0.08)] pt-4">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={!configured || busy !== null || !summaryReady}
                onClick={() => void onStub("fc")}
              >
                Generate flashcards
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={!configured || busy !== null || !summaryReady}
                onClick={() => void onStub("quiz")}
              >
                Generate quiz
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>

      {busy === "upload" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <Loader2 className="h-8 w-8 animate-spin text-copper" />
        </div>
      ) : null}
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
