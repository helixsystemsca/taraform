/**
 * FastAPI study backend (Render / local). Set `NEXT_PUBLIC_STUDY_API_URL` (no trailing slash).
 */

function baseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_STUDY_API_URL?.trim().replace(/\/$/, "") ?? "";
  return raw;
}

export function studyApiConfigured(): boolean {
  return baseUrl().length > 0;
}

export function studyApiBase(): string {
  return baseUrl();
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export type UnitCreateResponse = {
  id: string;
  title: string;
  pdf_file_path: string;
  created_at: string;
  text_preview: string;
};

export async function postUnit(file: File, title?: string): Promise<UnitCreateResponse> {
  const b = baseUrl();
  const fd = new FormData();
  fd.append("file", file);
  if (title) fd.append("title", title);
  const res = await fetch(`${b}/api/units/`, { method: "POST", body: fd });
  return parseJson(res);
}

export type SummaryRead = {
  id: string;
  unit_id: string;
  source_text: string;
  user_summary: string;
  ai_feedback: Record<string, unknown> | null;
  structured_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export async function postSummary(body: {
  id?: string;
  unit_id: string;
  source_text: string;
  user_summary: string;
}): Promise<SummaryRead> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/summaries/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function getSummary(id: string): Promise<SummaryRead> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/summaries/${encodeURIComponent(id)}`);
  return parseJson(res);
}

export type CoachResponse = {
  missing_concepts: string[];
  unclear_points: string[];
  improvement_suggestions: string[];
};

export async function postCoach(body: {
  source_text: string;
  user_summary: string;
  summary_id?: string;
}): Promise<CoachResponse> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/ai/coach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export type ImproveResponse = { improved_summary: string };

export async function postImprove(body: {
  user_summary: string;
  ai_feedback: Record<string, unknown>;
}): Promise<ImproveResponse> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/ai/improve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export type FlashcardItem = { front: string; back: string };

/** Uses cached `user_summary` + `ai_feedback` on the server; does not re-send source excerpt. */
export async function postFlashcards(body: { summary_id: string }): Promise<FlashcardItem[]> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/ai/flashcards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export type StubResponse = { status: string; message: string };

export async function postQuizStub(): Promise<StubResponse> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/ai/quiz`, { method: "POST" });
  return parseJson(res);
}

export type StickyNoteDto = {
  id: string;
  unit_id: string;
  page_number: number;
  x_position: number;
  y_position: number;
  content: string;
  created_at: string;
};

export type PdfTextHighlightDto = {
  id: string;
  page_number: number;
  text: string;
  rects: { x: number; y: number; w: number; h: number }[];
  /** Hex fill for overlay (optional; default yellow). */
  color?: string;
};

export type StudyHighlightRead = {
  id: string;
  unit_id: string;
  user_id: string | null;
  page: number;
  extracted_text: string;
  normalized_text: string;
  text_hash: string;
  rects: { x: number; y: number; w: number; h: number }[];
  color: string;
  created_at: string;
};

export type StudyGenerateResponse = {
  flashcards_created: number;
  quiz_questions_created: number;
  skipped_flashcards: boolean;
  skipped_quiz: boolean;
  fingerprint: string | null;
};

export type StudyFlashcardRead = {
  id: string;
  unit_id: string;
  highlight_id: string | null;
  question: string;
  answer: string;
  difficulty: string;
  created_at: string;
};

export type StudyQuizQuestionRead = {
  id: string;
  unit_id: string;
  highlight_id: string | null;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  question_type: string;
  created_at: string;
};

export type PdfMarkupPayload = {
  strokes_by_page?: Record<string, unknown>;
  text_highlights?: PdfTextHighlightDto[];
};

export async function listStickyNotes(unitId: string): Promise<StickyNoteDto[]> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/units/${encodeURIComponent(unitId)}/sticky-notes`);
  return parseJson(res);
}

export async function createStickyNote(
  unitId: string,
  body: { page_number: number; x_position: number; y_position: number; content?: string },
): Promise<StickyNoteDto> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/units/${encodeURIComponent(unitId)}/sticky-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, content: body.content ?? "" }),
  });
  return parseJson(res);
}

export async function patchStickyNote(
  unitId: string,
  noteId: string,
  body: { page_number?: number; x_position?: number; y_position?: number; content?: string },
): Promise<StickyNoteDto> {
  const b = baseUrl();
  const res = await fetch(
    `${b}/api/units/${encodeURIComponent(unitId)}/sticky-notes/${encodeURIComponent(noteId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseJson(res);
}

export async function deleteStickyNote(unitId: string, noteId: string): Promise<void> {
  const b = baseUrl();
  const res = await fetch(
    `${b}/api/units/${encodeURIComponent(unitId)}/sticky-notes/${encodeURIComponent(noteId)}`,
    { method: "DELETE" },
  );
  const text = await res.text();
  if (!res.ok) {
    let msg = text || `HTTP ${res.status}`;
    try {
      const data = text ? JSON.parse(text) : null;
      if (data && typeof data === "object" && "detail" in data) msg = String((data as { detail: unknown }).detail);
    } catch {
      /* use msg */
    }
    throw new Error(msg);
  }
}

export type PdfMarkupRead = { unit_id: string; payload: PdfMarkupPayload; updated_at: string };

export async function getPdfMarkup(unitId: string): Promise<PdfMarkupRead> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/units/${encodeURIComponent(unitId)}/pdf-markup`);
  return parseJson(res);
}

export async function putPdfMarkup(unitId: string, payload: PdfMarkupPayload): Promise<PdfMarkupRead> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/units/${encodeURIComponent(unitId)}/pdf-markup`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  return parseJson(res);
}

export async function syncStudyHighlights(unitId: string, highlights: PdfTextHighlightDto[]): Promise<StudyHighlightRead[]> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/study/highlights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      unit_id: unitId,
      highlights: highlights.map((h) => ({
        id: h.id,
        page: h.page_number,
        extracted_text: h.text,
        rects: h.rects,
        color: h.color ?? "#fef08a",
      })),
    }),
  });
  return parseJson(res);
}

export async function fetchStudyHighlights(unitId: string): Promise<StudyHighlightRead[]> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/study/highlights?unit_id=${encodeURIComponent(unitId)}`);
  return parseJson(res);
}

export async function postStudyGenerate(body: {
  unit_id: string;
  modes: ("flashcards" | "quiz")[];
  highlight_ids?: string[] | null;
  force?: boolean;
}): Promise<StudyGenerateResponse> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/study/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function fetchStudyFlashcards(unitId: string): Promise<StudyFlashcardRead[]> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/study/flashcards?unit_id=${encodeURIComponent(unitId)}`);
  return parseJson(res);
}

export async function fetchStudyQuizzes(unitId: string): Promise<StudyQuizQuestionRead[]> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/study/quizzes?unit_id=${encodeURIComponent(unitId)}`);
  return parseJson(res);
}
