const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

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
}: {
  systemPrompt: string;
  userPrompt: string;
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
        model: "gpt-4.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
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

const STRUCTURE_SYSTEM = `You are a study assistant. Break the user's content into clear sections and extract key concepts per section.
Return ONLY valid JSON matching this shape:
{"sections":[{"title":"string","summary":"string (optional)","concepts":["string", ...]}]}
Rules:
- 2–8 sections when possible
- 3–12 concepts per section when possible
- Concepts must be short phrases grounded in the content
- No markdown, no prose outside JSON`;

export async function generateStructure(content: string): Promise<StructureResult> {
  const data = await callOpenAI({
    systemPrompt: STRUCTURE_SYSTEM,
    userPrompt: `Content to structure:\n\n${content}`,
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

const QUIZ_SYSTEM = `You create study quizzes. Return ONLY valid JSON.
Shape: {"questions":[{"question":"string","choices":["A","B","C","D"],"correctIndex":0,"explanation":"string"}]}
Rules:
- Exactly 5 questions
- Each question has exactly 4 choices
- correctIndex is 0-based (0–3)
- Explanations must justify the correct answer using the provided content only
- No markdown outside JSON`;

export async function generateQuiz(content: string): Promise<QuizResult> {
  const data = await callOpenAI({
    systemPrompt: QUIZ_SYSTEM,
    userPrompt: `Source content for the quiz:\n\n${content}`,
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
