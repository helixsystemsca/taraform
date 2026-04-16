import * as React from "react";

export function useUndoRedo<T>(initial: T[]) {
  const [present, setPresent] = React.useState<T[]>(initial);
  const pastRef = React.useRef<T[][]>([]);
  const futureRef = React.useRef<T[][]>([]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const set = React.useCallback((next: T[] | ((prev: T[]) => T[]), { replace }: { replace?: boolean } = {}) => {
    setPresent((prev) => {
      const resolved = typeof next === "function" ? (next as (p: T[]) => T[])(prev) : next;
      if (!replace) {
        pastRef.current.push(prev);
        if (pastRef.current.length > 200) pastRef.current.shift();
        futureRef.current = [];
      }
      return resolved;
    });
  }, []);

  const undo = React.useCallback(() => {
    setPresent((prev) => {
      const past = pastRef.current;
      if (past.length === 0) return prev;
      const previous = past.pop()!;
      futureRef.current.push(prev);
      return previous;
    });
  }, []);

  const redo = React.useCallback(() => {
    setPresent((prev) => {
      const future = futureRef.current;
      if (future.length === 0) return prev;
      const next = future.pop()!;
      pastRef.current.push(prev);
      return next;
    });
  }, []);

  const clear = React.useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    setPresent([]);
  }, []);

  const reset = React.useCallback((value: T[]) => {
    pastRef.current = [];
    futureRef.current = [];
    setPresent(value);
  }, []);

  return { present, set, undo, redo, clear, reset, canUndo, canRedo };
}

