"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const seedLoader_1 = require("../lib/seedLoader");
function attachWorkspace(records, workspace) {
    return records.map((r) => ({ ...r, workspace }));
}
async function simulateInsert(kind, records) {
    console.log(`\n--- Simulated insert: ${kind} (${records.length}) ---`);
    // Print a small sample for quick verification.
    for (const row of records.slice(0, 3)) {
        console.log(row);
    }
    if (records.length > 3)
        console.log(`... (${records.length - 3} more)`);
}
async function main() {
    const courseId = "course_01";
    const concepts = await (0, seedLoader_1.loadCourse)(courseId);
    const scenarios = await (0, seedLoader_1.loadScenarios)(courseId);
    const pmConcepts = attachWorkspace(concepts, "pm");
    const pmScenarios = attachWorkspace(scenarios, "pm");
    console.log("Ingest run (placeholder)");
    console.log(`Course: ${courseId}`);
    console.log(`Concepts: ${pmConcepts.length}`);
    console.log(`Scenarios: ${pmScenarios.length}`);
    await simulateInsert("concept", pmConcepts);
    await simulateInsert("scenario", pmScenarios);
}
main().catch((err) => {
    console.error("Seed ingest failed:", err);
    process.exitCode = 1;
});
