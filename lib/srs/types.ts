export type ConceptRow = {
  id: string;
  device_id: string;
  section_id: string;
  concept: string;
  strength: number;
  stability: number;
  last_reviewed: string | null;
  next_review: string;
  created_at: string;
  updated_at: string;
};

export type SrsQuestion = {
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
};

