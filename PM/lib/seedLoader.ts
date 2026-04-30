import { readFile } from "node:fs/promises";
import path from "node:path";

export type SeedConcept = {
  id: string;
  type: "concept";
  title: string;
  definition: string;
  key_points: string[];
  why_it_matters: string;
  example: string;
  exam_trap: string;
  tags: string[];
  xp: number;
};

export type SeedScenario = {
  id: string;
  type: "scenario";
  scenario: string;
  question: string;
  answers: [string, string, string, string];
  correct_index: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  xp: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((v) => typeof v === "string")) return null;
  return value;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asFourAnswers(value: unknown): [string, string, string, string] | null {
  const arr = asStringArray(value);
  if (!arr || arr.length !== 4) return null;
  return [arr[0], arr[1], arr[2], arr[3]];
}

function ensureTags(tags: unknown): string[] {
  const arr = asStringArray(tags);
  return arr ?? [];
}

function ensureXp(xp: unknown, fallback: number): number {
  return asNumber(xp) ?? fallback;
}

function normalizeConcept(raw: unknown, idx: number): SeedConcept {
  if (!isRecord(raw)) throw new Error(`Concept at index ${idx} is not an object`);
  const id = asString(raw.id) ?? `init_${String(idx + 1).padStart(3, "0")}`;
  const title = asString(raw.title) ?? "";
  const definition = asString(raw.definition) ?? "";
  const key_points = asStringArray(raw.key_points) ?? [];
  const why_it_matters = asString(raw.why_it_matters) ?? "";
  const example = asString(raw.example) ?? "";
  const exam_trap = asString(raw.exam_trap) ?? "";

  if (!title || !definition) {
    throw new Error(`Concept ${id} missing title/definition`);
  }

  return {
    id,
    type: "concept",
    title,
    definition,
    key_points,
    why_it_matters,
    example,
    exam_trap,
    tags: ensureTags(raw.tags),
    xp: ensureXp(raw.xp, 15),
  };
}

function normalizeScenario(raw: unknown, idx: number): SeedScenario {
  if (!isRecord(raw)) throw new Error(`Scenario at index ${idx} is not an object`);
  const id = asString(raw.id) ?? `init_s_${String(idx + 1).padStart(3, "0")}`;
  const scenario = asString(raw.scenario) ?? "";
  const question = asString(raw.question) ?? "";
  const answers = asFourAnswers(raw.answers);
  const correct_index = asNumber(raw.correct_index);
  const explanation = asString(raw.explanation) ?? "";
  const difficulty = asString(raw.difficulty);

  if (!scenario || !question || !answers || correct_index === null || !explanation || !difficulty) {
    throw new Error(`Scenario ${id} missing required fields`);
  }
  if (correct_index < 0 || correct_index > 3) {
    throw new Error(`Scenario ${id} has invalid correct_index (expected 0..3)`);
  }
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
    throw new Error(`Scenario ${id} has invalid difficulty`);
  }

  return {
    id,
    type: "scenario",
    scenario,
    question,
    answers,
    correct_index,
    explanation,
    difficulty,
    tags: ensureTags(raw.tags),
    xp: ensureXp(raw.xp, 25),
  };
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

function dataRoot() {
  // Resolve relative to this file so ts-node works from any CWD.
  return path.resolve(__dirname, "..", "data");
}

function courseFile(courseId: string) {
  return path.join(dataRoot(), "courses", `${courseId}_initiation.json`);
}

function scenariosFile(courseId: string) {
  return path.join(dataRoot(), "scenarios", `${courseId}_scenarios.json`);
}

export async function loadCourse(courseId: string): Promise<SeedConcept[]> {
  const filePath = courseFile(courseId);
  const parsed = await readJsonFile(filePath);
  if (!Array.isArray(parsed)) throw new Error(`Course seed must be an array. File: ${filePath}`);
  return parsed.map((c, idx) => normalizeConcept(c, idx));
}

export async function loadScenarios(courseId: string): Promise<SeedScenario[]> {
  const filePath = scenariosFile(courseId);
  const parsed = await readJsonFile(filePath);
  if (!Array.isArray(parsed)) throw new Error(`Scenario seed must be an array. File: ${filePath}`);
  return parsed.map((s, idx) => normalizeScenario(s, idx));
}

