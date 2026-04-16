export type NotesTool = "pen" | "highlighter" | "eraser";

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
  tool: NotesTool;
};

export type LocalNote = {
  id: string;
  created_at: number;
  updated_at: number;
  chapter_id: string | null;
  title?: string;
  strokes: NoteStroke[];
};

