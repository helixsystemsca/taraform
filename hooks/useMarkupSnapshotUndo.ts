import * as React from "react";

import type { NoteStroke } from "@/components/notes/types";
import type { PdfTextHighlightDto } from "@/lib/studyApi";

export type MarkupSnapshot = {
  strokesByPage: Record<number, NoteStroke[]>;
  textHighlights: PdfTextHighlightDto[];
};

function clone(s: MarkupSnapshot): MarkupSnapshot {
  return JSON.parse(JSON.stringify(s)) as MarkupSnapshot;
}

export function useMarkupSnapshotUndo(initial: MarkupSnapshot) {
  const [present, setPresent] = React.useState<MarkupSnapshot>(() => clone(initial));
  const pastRef = React.useRef<MarkupSnapshot[]>([]);
  const futureRef = React.useRef<MarkupSnapshot[]>([]);
  const [histTick, setHistTick] = React.useState(0);
  const bump = React.useCallback(() => setHistTick((n) => n + 1), []);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  void histTick;

  const set = React.useCallback(
    (next: MarkupSnapshot | ((prev: MarkupSnapshot) => MarkupSnapshot)) => {
      setPresent((prev) => {
        const resolved = typeof next === "function" ? (next as (p: MarkupSnapshot) => MarkupSnapshot)(prev) : next;
        pastRef.current.push(clone(prev));
        if (pastRef.current.length > 60) pastRef.current.shift();
        futureRef.current = [];
        bump();
        return resolved;
      });
    },
    [bump],
  );

  const undo = React.useCallback(() => {
    setPresent((prev) => {
      const past = pastRef.current;
      if (past.length === 0) return prev;
      const previous = past.pop()!;
      futureRef.current.push(clone(prev));
      bump();
      return previous;
    });
  }, [bump]);

  const redo = React.useCallback(() => {
    setPresent((prev) => {
      const future = futureRef.current;
      if (future.length === 0) return prev;
      const next = future.pop()!;
      pastRef.current.push(clone(prev));
      bump();
      return next;
    });
  }, [bump]);

  const reset = React.useCallback(
    (value: MarkupSnapshot) => {
      pastRef.current = [];
      futureRef.current = [];
      setPresent(clone(value));
      bump();
    },
    [bump],
  );

  const clearHistory = React.useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    bump();
  }, [bump]);

  return { present, set, undo, redo, reset, clearHistory, canUndo, canRedo };
}
