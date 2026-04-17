import "server-only";

/**
 * Raw OpenAI HTTP calls and env access live here only on the server.
 * `server-only` prevents accidental imports from Client Components (would fail the build).
 * The browser must call Route Handlers under `app/api/*` instead.
 */
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4.1-mini";
const DEFAULT_MAX_TOKENS = 300;

export type OpenAIChatCompletionResponse = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    message?: { role?: string; content?: string | null };
    finish_reason?: string | null;
  }>;
  error?: { message?: string; type?: string; code?: string };
};

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Missing OPENAI_API_KEY. Set it in your environment (e.g. .env.local).");
  }
  return key;
}

/**
 * Calls OpenAI Chat Completions and returns the parsed JSON body from the HTTP response.
 */
export async function callOpenAI({
  systemPrompt,
  userPrompt,
  maxTokens,
}: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}): Promise<OpenAIChatCompletionResponse> {
  const apiKey = getApiKey();

  let res: Response;
  try {
    res = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: Math.max(1, Math.min(600, maxTokens ?? DEFAULT_MAX_TOKENS)),
      }),
    });
  } catch (e) {
    console.error("[openai] network error", e);
    throw new Error("Could not reach OpenAI. Check your network and try again.");
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (e) {
    console.error("[openai] invalid JSON body", e);
    throw new Error("OpenAI returned an invalid response.");
  }

  const parsed = body as OpenAIChatCompletionResponse;

  if (!res.ok) {
    const msg = parsed.error?.message || res.statusText || "OpenAI request failed";
    console.error("[openai] HTTP error", res.status, msg);
    throw new Error(`OpenAI error (${res.status}): ${msg}`);
  }

  if (parsed.error?.message) {
    console.error("[openai] API error", parsed.error);
    throw new Error(parsed.error.message);
  }

  return parsed;
}

function extractAssistantJsonString(data: OpenAIChatCompletionResponse): string {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    console.error("[openai] empty assistant content", data);
    throw new Error("OpenAI returned no message content.");
  }
  return content;
}

export type StructureResult = {
  sections: Array<{
    title: string;
    summary?: string;
    concepts: string[];
  }>;
};

export type DocumentType = "textbook" | "lecture_notes" | "legal" | "other";

const DOC_TYPE_SYSTEM =
  'Return ONLY valid JSON: {"document_type":"textbook|lecture_notes|legal|other"}.\n' +
  "Choose the single best label based on the text.";

export async function classifyDocumentType(sampleText: string): Promise<DocumentType> {
  const data = await callOpenAI({
    systemPrompt: DOC_TYPE_SYSTEM,
    userPrompt:
      "Classify this document as: textbook, lecture notes, legal, or other.\n\nTEXT SAMPLE:\n" +
      sampleText.slice(0, 6000),
    maxTokens: 50,
  });
  const raw = extractAssistantJsonString(data);
  try {
    const parsed = JSON.parse(raw) as { document_type?: DocumentType };
    const t = parsed.document_type;
    if (t === "textbook" || t === "lecture_notes" || t === "legal" || t === "other") return t;
  } catch {
    // fall through
  }
  return "other";
}

export type LegalExtract = {
  definitions: string[];
  rules: string[];
  processes: string[];
};

const LEGAL_SYSTEM =
  'Return ONLY valid JSON: {"definitions":["string"],"rules":["string"],"processes":["string"]}.\n' +
  "Extract only the most important items. Keep each item short (<= 16 words).";

export async function extractLegalConcepts(text: string): Promise<LegalExtract> {
  const data = await callOpenAI({
    systemPrompt: LEGAL_SYSTEM,
    userPrompt:
      "Extract only the most important concepts from this legal text:\n" +
      "- definitions\n" +
      "- rules\n" +
      "- responsibilities / processes\n" +
      "Ignore procedural or repetitive language.\n" +
      "Limit total items across all lists to 10–20.\n\nTEXT:\n" +
      text.slice(0, 8000),
    maxTokens: 260,
  });
  const raw = extractAssistantJsonString(data);
  try {
    const parsed = JSON.parse(raw) as Partial<LegalExtract>;
    return {
      definitions: Array.isArray(parsed.definitions) ? parsed.definitions.filter((x) => typeof x === "string").slice(0, 10) : [],
      rules: Array.isArray(parsed.rules) ? parsed.rules.filter((x) => typeof x === "string").slice(0, 10) : [],
      processes: Array.isArray(parsed.processes) ? parsed.processes.filter((x) => typeof x === "string").slice(0, 10) : [],
    };
  } catch (e) {
    console.error("[openai] extractLegalConcepts parse error", e, raw);
    throw new Error("Could not parse legal JSON from OpenAI.");
  }
}

export type DocumentMap = {
  sections: Array<{
    id: string;
    title: string;
    description: string;
    keywords: string[];
  }>;
};

const DOC_MAP_SYSTEM =
  'Return ONLY valid JSON: {"sections":[{"id":"string","title":"string","description":"string","keywords":["string"]}]}.\n' +
  "Create 5–10 main sections. Keep each description <= 2 sentences. 3–8 keywords each.";

export async function generateDocumentMap(sampleText: string): Promise<DocumentMap> {
  const data = await callOpenAI({
    systemPrompt: DOC_MAP_SYSTEM,
    userPrompt:
      "Analyze this document sample and return main topics/chapters with a brief description of each.\n\nSAMPLE:\n" +
      sampleText.slice(0, 8000),
    maxTokens: 260,
  });
  const raw = extractAssistantJsonString(data);
  try {
    const parsed = JSON.parse(raw) as DocumentMap;
    const cleaned = {
      sections: Array.isArray(parsed.sections)
        ? parsed.sections
            .filter((s) => s && typeof s === "object")
            .slice(0, 10)
            .map((s) => {
              const any = s as { id?: unknown; title?: unknown; description?: unknown; keywords?: unknown };
              const title = typeof any.title === "string" ? any.title.trim() : "Untitled";
              const id = typeof any.id === "string" && any.id.trim() ? any.id.trim() : title.toLowerCase().replace(/\s+/g, "_").slice(0, 40);
              const description = typeof any.description === "string" ? any.description.trim() : "";
              const keywords = Array.isArray(any.keywords) ? any.keywords.filter((k) => typeof k === "string").map((k) => k.trim()).filter(Boolean).slice(0, 8) : [];
              return { id, title, description, keywords };
            })
        : [],
    };
    return cleaned;
  } catch (e) {
    console.error("[openai] generateDocumentMap parse error", e, raw);
    throw new Error("Could not parse document map JSON from OpenAI.");
  }
}

const STRUCTURE_SYSTEM =
  'Return ONLY valid JSON: {"sections":[{"title":"string","summary":"string","concepts":["string"]}]}.\n' +
  "Summarize into 3 bullet points and 1 key takeaway per section (keep short).";

export async function generateStructure(content: string): Promise<StructureResult> {
  const data = await callOpenAI({
    systemPrompt: STRUCTURE_SYSTEM,
    userPrompt:
      "Summarize this text into:\n- 3 bullet points\n- 1 key takeaway\nKeep it concise.\n\nTEXT:\n" +
      content.slice(0, 8000),
  });
  const raw = extractAssistantJsonString(data);
  try {
    return JSON.parse(raw) as StructureResult;
  } catch (e) {
    console.error("[openai] generateStructure parse error", e, raw);
    throw new Error("Could not parse structure JSON from OpenAI.");
  }
}

export type QuizQuestion = {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
};

export type QuizResult = {
  questions: QuizQuestion[];
};

const QUIZ_SYSTEM =
  'Return ONLY valid JSON: {"questions":[{"question":"string","choices":["A","B","C","D"],"correctIndex":0,"explanation":"string"}]}.\n' +
  "Keep questions concise. Use only the source text.";

export async function generateQuiz(content: string): Promise<QuizResult> {
  const data = await callOpenAI({
    systemPrompt: QUIZ_SYSTEM,
    userPrompt:
      "Create 5 multiple-choice questions (4 choices) from the source.\n\nSOURCE:\n" + content.slice(0, 8000),
  });
  const raw = extractAssistantJsonString(data);
  try {
    const parsed = JSON.parse(raw) as QuizResult;
    if (!Array.isArray(parsed.questions) || parsed.questions.length !== 5) {
      throw new Error("Invalid questions array");
    }
    return parsed;
  } catch (e) {
    console.error("[openai] generateQuiz parse error", e, raw);
    throw new Error("Could not parse quiz JSON from OpenAI.");
  }
}
