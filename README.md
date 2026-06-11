# InterviewAI

Free, ad-supported AI mock-interview platform. Job seekers practice text-based
interviews personalised from their real GitHub projects and get a 0–10 score
with feedback.

**Stack:** FastAPI (Heroku) · Next.js (Vercel) · Supabase (Postgres + Google OAuth) · Groq LLM · ₹0 infra via GitHub Student Pack.

## Status

- [x] **Phase 1 — Backend core**: GitHub scraping, interview Q&A, AI scoring
- [x] **Phase 2 — Frontend**: Next.js + Supabase auth + landing/interview/results pages
- [ ] **Phase 3 — Production**: Heroku + Vercel + custom domain + Sentry
- [ ] **Phase 4 — Revenue**: 6 SEO practice pages, 12 blog posts, AdSense

## Run the backend locally

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GROQ_API_KEY (+ GITHUB_TOKEN recommended)
uvicorn main:app --reload
```

Without `DATABASE_URL` it uses a local SQLite file, so you can develop before
Supabase is set up. For Supabase, run `backend/schema.sql` in the SQL editor
and put the connection string in `.env`.

## Run the frontend locally

```bash
cd frontend
npm install
cp .env.local.example .env.local   # defaults work for local dev
npm run dev
```

Open http://localhost:3000 (backend must be running on :8000). Sign-in is
hidden until the Supabase env vars are set, so the full interview flow works
anonymously while you finish the Supabase Google OAuth setup.

## API

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Health check (Heroku) |
| `/api/github/profile?username=` | GET | Cleaned repo list for a user |
| `/api/interviews` | POST | Create interview `{github_url, interview_type}` → id + first question |
| `/api/interviews/{id}` | GET | Status, transcript, score |
| `/api/interviews/{id}/message` | POST | Send answer `{content}` → next question (5 questions total) |
| `/api/interviews/{id}/complete` | POST | Score the interview → `{score, feedback}` |

Interactive docs at `http://localhost:8000/docs` when running.

## Quick test flow

```bash
curl localhost:8000/api/health
curl "localhost:8000/api/github/profile?username=<your-github>"
curl -X POST localhost:8000/api/interviews -H 'Content-Type: application/json' \
  -d '{"github_url": "https://github.com/<your-github>", "interview_type": "swe"}'
# answer with the returned interview_id:
curl -X POST localhost:8000/api/interviews/<id>/message -H 'Content-Type: application/json' \
  -d '{"content": "my answer..."}'
# after 5 questions:
curl -X POST localhost:8000/api/interviews/<id>/complete
```

## Deployment (Phase 3)

Backend: Heroku, auto-deploy from GitHub — `backend/Procfile` is already in
place; set the env vars from `.env.example` as Config Vars. Frontend: Vercel.
