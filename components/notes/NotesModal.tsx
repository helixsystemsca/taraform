"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Trash2 } from "lucide-react";

import type { LocalNote, NoteStroke } from "@/components/notes/types";
import { NotesCanvas } from "@/components/notes/NotesCanvas";
import { NotesToolbar } from "@/components/notes/NotesToolbar";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { cn } from "@/lib/utils";
import { useAnnotationToolbarStore } from "@/stores/useAnnotationToolbarStore";
import { deleteLocalNote, getLocalNote, listLocalNotes, newNoteId, putLocalNote } from "@/utils/storage";

type ChapterOption = { id: string; label: string };

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function NotesModal({
  defaultChapterId,
  chapters,
}: {
  defaultChapterId: string | null;
  chapters: ChapterOption[];
}) {
  const router = useRouter();

  const [open, setOpen] = React.useState(true);
  const [chapterId, setChapterId] = React.useState<string | null>(defaultChapterId);
  const [notesIndex, setNotesIndex] = React.useState<{ id: string; updated_at: number; created_at: number; title?: string }[]>(
    [],
  );
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState<string>("");

  const tool = useAnnotationToolbarStore((s) => s.tool);
  const setTool = useAnnotationToolbarStore((s) => s.setTool);
  const color = useAnnotationToolbarStore((s) => s.color);
  const setColor = useAnnotationToolbarStore((s) => s.setColor);
  const size = useAnnotationToolbarStore((s) => s.size);
  const setSize = useAnnotationToolbarStore((s) => s.setSize);

  React.useEffect(() => {
    if (!open) return;
    const t = useAnnotationToolbarStore.getState().tool;
    if (t === "select" || t === "sticky") setTool("pen");
  }, [open, setTool]);

  const { present: strokes, set: setStrokes, undo, redo, canUndo, canRedo, reset } = useUndoRedo<NoteStroke>([]);
  const exportPngRef = React.useRef<(() => string | null) | null>(null);

  const noteMetaRef = React.useRef<Pick<LocalNote, "id" | "created_at" | "chapter_id"> | null>(null);
  const dirtyRef = React.useRef(false);
  const lastSavedAtRef = React.useRef<number>(0);
  const [saveBadge, setSaveBadge] = React.useState<{ dirty: boolean; savedAt: number }>({ dirty: false, savedAt: 0 });

  React.useEffect(() => {
    void listLocalNotes(chapterId).then((rows) => {
      setNotesIndex(rows);
      if (!activeNoteId && rows[0]?.id) setActiveNoteId(rows[0].id);
      if (!activeNoteId && !rows[0]?.id) void createNewNote(chapterId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  React.useEffect(() => {
    if (!activeNoteId) return;
    let cancelled = false;
    void getLocalNote(activeNoteId).then((n) => {
      if (cancelled) return;
      if (!n) return;
      noteMetaRef.current = { id: n.id, created_at: n.created_at, chapter_id: n.chapter_id ?? null };
      setTitle(n.title ?? "");
      reset(n.strokes ?? []);
      dirtyRef.current = false;
      lastSavedAtRef.current = n.updated_at ?? Date.now();
      setSaveBadge({ dirty: false, savedAt: n.updated_at ?? Date.now() });
    });
    return () => {
      cancelled = true;
    };
  }, [activeNoteId, reset]);

  React.useEffect(() => {
    dirtyRef.current = true;
    setSaveBadge((s) => ({ ...s, dirty: true }));
  }, [strokes, title]);

  const saveNow = React.useCallback(async () => {
    const meta = noteMetaRef.current;
    if (!meta) return;
    const now = Date.now();
    const note: LocalNote = {
      id: meta.id,
      created_at: meta.created_at,
      updated_at: now,
      chapter_id: chapterId ?? null,
      title: title.trim() || undefined,
      strokes,
    };
    await putLocalNote(note);
    dirtyRef.current = false;
    lastSavedAtRef.current = now;
    setSaveBadge({ dirty: false, savedAt: now });
    setNotesIndex((prev) => {
      const next = prev.some((r) => r.id === note.id)
        ? prev.map((r) => (r.id === note.id ? { ...r, updated_at: note.updated_at, title: note.title } : r))
        : [{ id: note.id, created_at: note.created_at, updated_at: note.updated_at, title: note.title }, ...prev];
      next.sort((a, b) => b.updated_at - a.updated_at);
      return next;
    });
  }, [chapterId, strokes, title]);

  React.useEffect(() => {
    const t = window.setInterval(() => {
      if (!dirtyRef.current) return;
      void saveNow();
    }, 2500);
    return () => window.clearInterval(t);
  }, [saveNow]);

  const createNewNote = React.useCallback(
    async (chId: string | null) => {
      const now = Date.now();
      const id = newNoteId();
      const note: LocalNote = {
        id,
        created_at: now,
        updated_at: now,
        chapter_id: chId ?? null,
        strokes: [],
      };
      await putLocalNote(note);
      noteMetaRef.current = { id, created_at: now, chapter_id: chId ?? null };
      setTitle("");
      reset([]);
      dirtyRef.current = false;
      lastSavedAtRef.current = now;
      setSaveBadge({ dirty: false, savedAt: now });
      setActiveNoteId(id);
      setNotesIndex((prev) => [{ id, created_at: now, updated_at: now }, ...prev]);
    },
    [reset],
  );

  const deleteActive = React.useCallback(async () => {
    if (!activeNoteId) return;
    await deleteLocalNote(activeNoteId);
    setNotesIndex((prev) => {
      const filtered = prev.filter((r) => r.id !== activeNoteId);
      const nextId = filtered[0]?.id ?? null;
      setActiveNoteId(nextId);
      if (!nextId) void createNewNote(chapterId);
      return filtered;
    });
  }, [activeNoteId, chapterId, createNewNote]);

  const close = React.useCallback(() => {
    setOpen(false);
    window.setTimeout(() => router.back(), 120);
  }, [router]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveNow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open, redo, saveNow, undo]);

  return (
    <div className={cn("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}>
      <div
        className={cn(
          "absolute inset-0 bg-[rgba(61,43,31,0.28)] backdrop-blur-[12px] transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={close}
      />

      {/* Full viewport shell so canvas + chrome use 100dvh (phones/tablets) with safe-area insets. */}
      <div
        className={cn(
          "absolute inset-0 box-border flex h-full min-h-0 flex-col",
          "pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))]",
        )}
      >
        <div
          className={cn(
            "relative flex min-h-0 w-full min-w-0 flex-1 flex-col",
            "transition duration-200 will-change-transform",
            open ? "scale-100 opacity-100" : "scale-[0.985] opacity-0",
          )}
        >
          <div className="flex min-h-0 flex-1 items-stretch gap-2 sm:gap-3 md:gap-4">
            <aside className="pointer-events-auto hidden h-full min-h-0 w-[min(280px,32vw)] shrink-0 overflow-hidden rounded-xl border border-[rgba(120,90,80,0.1)] bg-surface-panel shadow-warm backdrop-blur-xl md:flex md:flex-col">
              <div className="flex items-center justify-between gap-2 border-b border-[rgba(120,90,80,0.08)] bg-rose-light/35 px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-copper" strokeWidth={1.5} />
                  <div className="font-display text-sm font-medium text-ink">Notebook</div>
                </div>
                <button
                  type="button"
                  onClick={() => void createNewNote(chapterId)}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(120,90,80,0.12)] bg-surface-page/90 px-3 py-1.5 text-xs font-medium text-ink-secondary shadow-sm transition-editorial hover:border-copper/22 hover:bg-rose-light/45 hover:text-ink"
                >
                  <Plus className="h-4 w-4 text-copper" strokeWidth={1.5} />
                  New
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden p-4">
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">Chapter</div>
                  <select
                    value={chapterId ?? ""}
                    onChange={(e) => setChapterId(e.target.value || null)}
                    className="w-full rounded-lg border border-[rgba(120,90,80,0.12)] bg-surface-page/95 px-3 py-2 text-sm text-ink shadow-sm outline-none transition-editorial focus:border-copper/25 focus:ring-2 focus:ring-copper/15"
                  >
                    <option value="">Unlinked</option>
                    {chapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">Title</div>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Untitled note…"
                    className="w-full rounded-lg border border-[rgba(120,90,80,0.12)] bg-surface-page/95 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 shadow-sm outline-none transition-editorial focus:border-copper/25 focus:ring-2 focus:ring-copper/15"
                  />
                </div>

                <div className="flex min-h-0 flex-1 flex-col space-y-1.5 overflow-hidden">
                  <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">Notes</div>
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-1">
                    {notesIndex.map((n) => {
                      const active = n.id === activeNoteId;
                      const label = n.title || new Date(n.created_at).toLocaleDateString();
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => setActiveNoteId(n.id)}
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-left text-sm transition-editorial",
                            active
                              ? "border-[rgba(120,90,80,0.12)] bg-rose-light/50 text-ink shadow-[inset_3px_0_0_0_#c58f8f] shadow-warm"
                              : "border-[rgba(120,90,80,0.08)] bg-surface-page/80 text-ink-secondary hover:border-[rgba(120,90,80,0.12)] hover:bg-rose-light/25 hover:text-ink",
                          )}
                        >
                          <div className="truncate font-medium">{label}</div>
                          <div className="mt-0.5 text-[11px] text-ink-muted">
                            Updated {new Date(n.updated_at).toLocaleString()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void deleteActive()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[rgba(120,90,80,0.12)] bg-surface-page/90 px-3 py-2 text-sm font-medium text-ink-secondary transition-editorial hover:border-red-200/80 hover:bg-[rgba(254,242,242,0.85)] hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete note
                </button>
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 self-stretch sm:gap-2">
              <div className="z-30 flex shrink-0 items-center gap-2">
                <div className="min-w-0 flex-1">
                  <NotesToolbar
                    mode="draw"
                    tool={tool}
                    onToolChange={setTool}
                    color={color}
                    onColorChange={setColor}
                    size={size}
                    onSizeChange={setSize}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={undo}
                    onRedo={redo}
                    onClear={() => setStrokes([], { replace: false })}
                    onSave={() => void saveNow()}
                    onExportPng={() => {
                      const dataUrl = exportPngRef.current?.();
                      if (!dataUrl) return;
                      downloadDataUrl(dataUrl, `taraform-note-${new Date().toISOString().slice(0, 10)}.png`);
                    }}
                  />
                </div>
                <div className="shrink-0 rounded-full border border-[rgba(120,90,80,0.12)] bg-surface-panel/90 px-2.5 py-1.5 text-[10px] font-medium leading-tight text-ink-secondary shadow-warm backdrop-blur-xl sm:px-3 sm:text-xs">
                  {saveBadge.dirty
                    ? "Saving…"
                    : `Saved ${new Date(saveBadge.savedAt || lastSavedAtRef.current || Date.now()).toLocaleTimeString()}`}
                </div>
              </div>
              <div className="relative flex min-h-0 min-w-0 flex-1 items-start justify-center">
                <div className="h-full max-h-full w-auto max-w-full aspect-[8.5/11]">
                  <NotesCanvas
                    strokes={strokes}
                    onChangeStrokes={setStrokes}
                    tool={tool}
                    color={color}
                    size={size}
                    onExportPngReady={(fn) => {
                      exportPngRef.current = fn;
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

