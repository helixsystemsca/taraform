# pm_trainer_setup.md

## Goal

Create a separate PM training app inside the existing Taraform project
without affecting current functionality.

------------------------------------------------------------------------

## 1. Branch Setup

Create a new branch for development:

``` bash
git checkout -b feature/pm-trainer
```

Do NOT modify existing Taraform core logic.

------------------------------------------------------------------------

## 2. Routing Structure

Add a new route:

-   /pm

This route should: - Load a completely separate layout - Not reuse
Taraform navigation - Not interfere with existing routes

------------------------------------------------------------------------

## 3. Frontend Structure

Create a new folder:

/src/pm/

Inside include:

-   pages/
-   components/
-   hooks/

Initial page:

/pm/index.tsx (or equivalent)

------------------------------------------------------------------------

## 4. Layout Rules

PM app should have: - Separate header - Separate styling/theme - No
dependency on Taraform UI assumptions

------------------------------------------------------------------------

## 5. Database (Supabase)

Add new tables (do NOT modify existing ones):

-   pm_concepts
-   pm_scenarios
-   pm_answers
-   pm_progress

Each table should be clearly namespaced with "pm\_"

------------------------------------------------------------------------

## 6. Data Models (Basic)

Concept: - id - title - content - domain

Scenario: - id - concept_id - question - options - correct_answer -
explanation

Answer: - id - user_id - scenario_id - selected_answer - is_correct

Progress: - user_id - domain - score - last_updated

------------------------------------------------------------------------

## 7. Backend (Optional)

If backend routes are needed:

Add: - /api/pm/\*

Do NOT modify existing endpoints.

------------------------------------------------------------------------

## 8. Core Feature (MVP)

Build only:

1.  Concept display
2.  Scenario question
3.  Answer selection
4.  Explanation display
5.  Save result

------------------------------------------------------------------------

## 9. Rules

-   Do NOT refactor Taraform
-   Do NOT share state unintentionally
-   Keep all PM logic isolated
-   Prioritize speed over perfection

------------------------------------------------------------------------

## 10. Future

Once validated: - Extract reusable components - Consider separating into
its own project
