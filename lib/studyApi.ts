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

export type StubResponse = { status: string; message: string };

export async function postFlashcardsStub(): Promise<StubResponse> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/ai/flashcards`, { method: "POST" });
  return parseJson(res);
}

export async function postQuizStub(): Promise<StubResponse> {
  const b = baseUrl();
  const res = await fetch(`${b}/api/ai/quiz`, { method: "POST" });
  return parseJson(res);
}
