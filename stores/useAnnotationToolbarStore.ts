import { create } from "zustand";

import type { NotesTool } from "@/components/notes/types";

type AnnotationToolbarState = {
  tool: NotesTool;
  color: string;
  size: number;
  setTool: (tool: NotesTool) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
};

export const useAnnotationToolbarStore = create<AnnotationToolbarState>((set) => ({
  tool: "pen",
  color: "#2b2b2b",
  size: 10,
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),
}));
