"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCourse = loadCourse;
exports.loadScenarios = loadScenarios;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function asString(value) {
    return typeof value === "string" ? value : null;
}
function asStringArray(value) {
    if (!Array.isArray(value))
        return null;
    if (!value.every((v) => typeof v === "string"))
        return null;
    return value;
}
function asNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function asFourAnswers(value) {
    const arr = asStringArray(value);
    if (!arr || arr.length !== 4)
        return null;
    return [arr[0], arr[1], arr[2], arr[3]];
}
function ensureTags(tags) {
    const arr = asStringArray(tags);
    return arr ?? [];
}
function ensureXp(xp, fallback) {
    return asNumber(xp) ?? fallback;
}
function normalizeConcept(raw, idx) {
    if (!isRecord(raw))
        throw new Error(`Concept at index ${idx} is not an object`);
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
function normalizeScenario(raw, idx) {
    if (!isRecord(raw))
        throw new Error(`Scenario at index ${idx} is not an object`);
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
async function readJsonFile(filePath) {
    const raw = await (0, promises_1.readFile)(filePath, "utf8");
    return JSON.parse(raw);
}
function courseFile(courseId) {
    return node_path_1.default.join(process.cwd(), "pm", "data", "courses", `${courseId}_initiation.json`);
}
function scenariosFile(courseId) {
    return node_path_1.default.join(process.cwd(), "pm", "data", "scenarios", `${courseId}_scenarios.json`);
}
async function loadCourse(courseId) {
    const filePath = courseFile(courseId);
    const parsed = await readJsonFile(filePath);
    if (!Array.isArray(parsed))
        throw new Error(`Course seed must be an array. File: ${filePath}`);
    return parsed.map((c, idx) => normalizeConcept(c, idx));
}
async function loadScenarios(courseId) {
    const filePath = scenariosFile(courseId);
    const parsed = await readJsonFile(filePath);
    if (!Array.isArray(parsed))
        throw new Error(`Scenario seed must be an array. File: ${filePath}`);
    return parsed.map((s, idx) => normalizeScenario(s, idx));
}
