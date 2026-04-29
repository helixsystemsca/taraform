# schema.md --- PM Trainer Database Schema & Seed Data

## Overview

This document defines the Supabase tables for the PM trainer and
provides initial seed data. All tables are namespaced with `pm_` to
avoid conflicts.

------------------------------------------------------------------------

# 🧱 Tables

## 1. pm_concepts

Stores micro-learning content.

Columns: - id (uuid, primary key) - title (text) - content (text) -
domain (text) --- fundamentals \| planning \| agile \| business -
created_at (timestamp)

------------------------------------------------------------------------

## 2. pm_scenarios

Stores decision-based questions.

Columns: - id (uuid, primary key) - concept_id (uuid, foreign key →
pm_concepts.id) - question (text) - type (text) --- mcq \| multi \|
ordering - options (jsonb) - correct_answer (jsonb) - explanation
(jsonb) - difficulty (text) --- easy \| medium \| hard

------------------------------------------------------------------------

## 3. pm_answers

Stores user responses.

Columns: - id (uuid, primary key) - user_id (uuid) - scenario_id
(uuid) - selected_answer (jsonb) - is_correct (boolean) - confidence
(text) --- low \| medium \| high - created_at (timestamp)

------------------------------------------------------------------------

## 4. pm_progress

Tracks performance by domain.

Columns: - user_id (uuid) - domain (text) - correct_count (int) -
total_attempts (int) - last_updated (timestamp)

------------------------------------------------------------------------

# 🌱 Seed Data

## Concepts

\[ { "id": "c1", "title": "Project vs Operations", "content": "A project
is temporary and creates a unique result. Operations are ongoing and
repetitive.", "domain": "fundamentals" }, { "id": "c2", "title":
"Scope", "content": "Scope defines what is included and excluded in a
project. It prevents uncontrolled changes.", "domain": "planning" }\]

------------------------------------------------------------------------

## Scenarios

\[ { "id": "s1", "concept_id": "c1", "type": "mcq", "question": "A team
performs daily maintenance but occasionally installs new systems. Which
is a project?", "options": \[ "Daily maintenance", "Installing new
system", "Both are projects" \], "correct_answer": \[1\], "difficulty":
"easy", "explanation": { "principle": "Projects are temporary and create
unique outcomes", "why_correct": "Installing a new system is a one-time
effort with a unique outcome", "why_wrong": \[ "Maintenance is ongoing
work", "Not all work is a project" \] } }, { "id": "s2", "concept_id":
"c2", "type": "mcq", "question": "A client keeps adding small requests
mid-project. What should you do?", "options": \[ "Accept changes",
"Reject all changes", "Evaluate impact and submit change request" \],
"correct_answer": \[2\], "difficulty": "easy", "explanation": {
"principle": "Control scope through structured change management",
"why_correct": "Formal change control ensures impact is understood",
"why_wrong": \[ "Accepting leads to scope creep", "Rejecting harms
stakeholder relationships" \] } }\]

------------------------------------------------------------------------

# 🧠 Notes

-   Use UUIDs in production (replace simple IDs)
-   Keep explanations rich --- they replace AI feedback
-   Expand dataset gradually (quality over quantity)
