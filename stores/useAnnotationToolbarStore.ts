import { create } from "zustand";

import type { AnnotationTool } from "@/lib/annotations";

type AnnotationToolbarState = {
  tool: AnnotationTool;
  color: string;
  size: number;
  selectedAnnotationId: string | null;
  setTool: (tool: AnnotationTool) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  setSelectedAnnotation: (id: string | null) => void;
  clearSelection: () => void;
};

export const useAnnotationToolbarStore = create<AnnotationToolbarState>((set) => ({
  tool: "pen",
  color: "#2b2b2b",
  size: 10,
  selectedAnnotationId: null,
  setTool: (tool) =>
    set((s) => ({
      tool,
      selectedAnnotationId: tool === "select" ? s.selectedAnnotationId : null,
    })),
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),
  setSelectedAnnotation: (id) => set({ selectedAnnotationId: id }),
  clearSelection: () => set({ selectedAnnotationId: null }),
}));
