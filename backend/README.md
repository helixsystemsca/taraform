# Taraform Study API (FastAPI)

Full-stack study workflow: **units** (PDF files), **summaries** (user-written + source excerpt), **AI coach** (structured feedback, cached on the summary row), **improve** (optional rewrite from feedback). Flashcards and quiz routes are stubs for now.

## Run locally

From this directory:

```bash
py -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
set OPENAI_API_KEY=sk-...   # Windows
export OPENAI_API_KEY=sk-...  # macOS/Linux
py -m uvicorn app.main:app --reload --port 8000
```

- API: `http://127.0.0.1:8000`
- Docs: `http://127.0.0.1:8000/docs`
- Health: `GET /health`

Point the Next.js app at the API:

```bash
NEXT_PUBLIC_STUDY_API_URL=http://127.0.0.1:8000
```

## Environment

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for `/api/ai/coach` and `/api/ai/improve`. |
| `DATABASE_URL` | Optional. If unset, uses SQLite at `./data/study.db`. On Render, use a PostgreSQL URL (asyncpg). |
| `CORS_ORIGINS` | Comma-separated browser origins (no spaces required). If unset, defaults to `http://localhost:3000` only. **No `*`.** Include production and Vercel preview URLs, e.g. `https://taraform.helixsystems.ca,https://taraform-xxx.vercel.app`. |
| `UPLOAD_ROOT` | Directory for uploaded PDFs (default `./uploads`). |

## Deploy on Render

1. Create a **Web Service**, runtime **Python 3.12+** (avoid pre-release 3.14 unless you intend to).
2. **Root directory:** either **`backend`** (recommended) or the **repo root** (monorepo).
3. **Build command:** `pip install -r requirements.txt` (from the root directory you set).
4. **Start command** (pick one to match root directory):
   - Root **`backend`:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Root **repo** (parent of `backend/`): `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`  
   Imports use package-relative paths so both work.
5. Set `OPENAI_API_KEY`, `CORS_ORIGINS` (comma-separated production + any Vercel preview hosts you use), and `DATABASE_URL` (managed PostgreSQL recommended so data survives deploys).
6. Copy the service URL into Vercel as `NEXT_PUBLIC_STUDY_API_URL` (no trailing slash).

SQLite on Render’s ephemeral disk is fine for demos; production should use PostgreSQL.

## Endpoints

- `POST /api/units/` — multipart `file` (+ optional `title`); stores PDF and returns `text_preview` (first pages only).
- `POST /api/summaries/` — create or update summary (`id` optional for updates).
- `GET /api/summaries/{id}` — fetch summary including cached `ai_feedback`.
- `POST /api/ai/coach` — coach JSON; uses cache when `summary_id` points at a row with `ai_feedback`.
- `POST /api/ai/improve` — returns `improved_summary`.
- `POST /api/ai/flashcards`, `POST /api/ai/quiz` — stubs.
