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
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

   See `.env.example` for the variable name. The key is read only on the server (`process.env.OPENAI_API_KEY` in Route Handlers and Server Actions). Do not use `NEXT_PUBLIC_OPENAI_API_KEY`. On Vercel, add `OPENAI_API_KEY` under Project → Settings → Environment Variables for Production (and Preview if needed), then redeploy.
   Supabase is used for auth, settings, and audio storage. Server code reads `SUPABASE_URL` / `SUPABASE_ANON_KEY` and browser code reads the `NEXT_PUBLIC_` equivalents.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open:

   `http://localhost:3000`

   **Custom domain (e.g. `taraform.helixsystems.ca`):** keep **no** `basePath` (default).  
   **Subpath only** (e.g. `helixsystems.ca/taraform`): set in `.env.local`:

   `NEXT_PUBLIC_BASE_PATH=/taraform`

   and add the same value to Vercel → Project → Environment Variables, then redeploy.

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

Study progress (sections, notes, quiz results) stays in the browser (`localStorage`, key `taraform-study-storage`) unless you export it.
Accounts are used for **Settings** (notifications toggle) and **Encouragement audio** (uploads stored in Supabase Storage).

## Supabase auth + settings (required)

- **SQL**: run `supabase/sql/auth_settings_audio.sql` in the Supabase SQL editor (creates `profiles`, `user_audio`, and RLS policies; also a trigger to create a profile row at signup).
- **Storage**: create a private bucket named `audio` (Storage → Buckets).
- **Redirect URLs** (Supabase Auth → URL Configuration):
  - Local: `http://localhost:3000/auth/callback`
  - Vercel: `https://<your-domain>/auth/callback`

## Future: Supabase sync (optional)

If you want to sync study progress across devices later, you can add tables for sections/notes/quiz results and merge the local export JSON with the server rows.

## Project layout (high level)

- `src/app` — App Router, server actions for AI.
- `src/stores/useStudyStore.ts` — persisted Zustand study state.
- `components/taraform` — screens (dashboard, section, quiz, analytics).
- `components/glass` — reusable liquid-glass surfaces.
- `lib` — AI helpers, extraction mapping, optional `withAppBasePath` when using a subpath.

## License

Private project — adjust as needed.
