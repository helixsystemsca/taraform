/** Shared toolbar: notepad uses pen + ink; study PDF uses select + sticky + ink. */
export type NotesTool = "select" | "pen" | "highlighter" | "eraser" | "sticky";

/** Tools that produce canvas strokes (excludes select / sticky). */
export type DrawTool = "pen" | "highlighter" | "eraser";

export type NotePoint = {
  x: number;
  y: number;
  pressure: number;
};

export type NoteStroke = {
  id: string;
  points: NotePoint[];
  color: string;
  size: number;
  tool: DrawTool;
};

export type LocalNote = {
  id: string;
  created_at: number;
  updated_at: number;
  chapter_id: string | null;
  title?: string;
  strokes: NoteStroke[];
};

