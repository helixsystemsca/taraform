# Taraform

Apple-inspired study companion for nursing grad school: upload scanned textbook pages, extract grounded text with GPT‑4o (Vercel AI SDK), take handwritten notes (**react-sketch-canvas**), generate NCLEX-style quizzes, and track time and confidence locally.

## Requirements

- Node.js 20+
- npm 10+
- OpenAI API key (for vision + structured outputs)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Create `.env.local` in the project root:

   ```bash
   OPENAI_API_KEY=sk-...
   ```

   See `.env.example` for the variable name.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app is configured with `basePath: "/taraform"`. Open:

   `http://localhost:3000/taraform`

4. **Production build**

   ```bash
   npm run build
   npm start
   ```

## Features (MVP)

- **Upload flow**: drag/tap upload → server action → structured extraction → sections saved via Zustand (`useStudyStore`).
- **Library & sections**: dashboard glass cards; sidebar groups by chapter.
- **Tabs per section**: Content · My Notes · Generate Quiz · Analytics.
- **Notes**: typed notes + vector sketch canvas; auto-saved to `localStorage`.
- **Quiz**: grounded generation; one-by-one questions; confidence after each item; time tracked.
- **Analytics**: Recharts (time vs. confidence) and heuristic “review” suggestions.
- **Backup**: Export / import full JSON from the header.

## Data & privacy

All study data stays in the browser (`localStorage`, key `taraform-study-storage`) unless you export it. There is no account system in the MVP.

## Future: Supabase sync (outline)

1. Add Supabase project + `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. On login, merge local JSON with remote rows (`sections`, `notes`, `quiz_results`, `time_spent`).
3. Prefer **last-write-wins** per section with a `updated_at` timestamp, or use a small CRDT if you need true offline-first merging.
4. Keep export/import as an escape hatch for Tara to own her data.

## Project layout (high level)

- `src/app` — App Router, server actions for AI.
- `src/stores/useStudyStore.ts` — persisted Zustand study state.
- `src/components/taraform` — screens (dashboard, section, quiz, analytics).
- `src/components/glass` — reusable liquid-glass surfaces.
- `src/lib` — AI helpers, extraction mapping, base path for `/taraform` assets.

## License

Private project — adjust as needed.
