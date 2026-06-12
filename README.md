# InterviewAI

Free, ad-supported AI mock-interview platform. Job seekers paste their GitHub URL and get a 5-question text interview personalised from their real repos, then a 0–10 score with feedback.

**Stack:** FastAPI + SQLAlchemy (Heroku) · Next.js 14 Pages Router (Vercel) · Supabase Postgres + Google OAuth · Groq LLM · ₹0 infra via GitHub Student Pack.

## Status

- [x] **Phase 1 — Backend**: GitHub scraping, interview Q&A, AI scoring (FastAPI)
- [x] **Phase 2 — Frontend**: Next.js + interview/results flow, production build ready
- [ ] **User test gate**: 5 complete self-interviews on localhost
- [ ] **Supabase setup**: Schema + Google OAuth (run `backend/schema.sql`)
- [ ] **Phase 3 — Deploy**: Heroku + Vercel + custom domain + Sentry
- [ ] **Phase 4 — Revenue**: 6 SEO `/practice/[topic]` pages, 12 blog posts, privacy/about/contact pages, AdSense

## Run the backend locally

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GROQ_API_KEY (+ GITHUB_TOKEN recommended)
uvicorn main:app --reload --host 0.0.0.0  # WSL2: add --host 0.0.0.0 to reach from Windows browser
```

Without `DATABASE_URL` it uses SQLite locally. For Supabase, run `backend/schema.sql` in the SQL editor and put the connection string in `.env`. Backend runs on `localhost:8000`.

## Run the frontend locally

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Opens http://localhost:3000 (backend must run on :8000). Auth UI hides and the app works anonymously until Supabase env vars are set — this graceful degradation is intentional for development.

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

Backend: Heroku auto-deploy from GitHub (`backend/Procfile` in place). Set env vars as Config Vars.
Frontend: Vercel (auto-deploy from GitHub).

## Architecture notes

- **Backend**: FastAPI + SQLAlchemy. Groq calls for questions (`GROQ_QUESTION_MODEL` env) and scoring (`GROQ_SCORING_MODEL`, defaults to llama-3.3-70b-versatile). CORS allows `localhost:3000` + `FRONTEND_ORIGIN` env.
- **Frontend**: Next.js 14 Pages Router. `lib/api.ts` is the typed API client. `lib/supabase.ts` gracefully degrades when env vars unset.
- **Interview flow**: 5-question loop. The "last question" sentinel reply is NOT stored in DB (max 5 assistant messages).

## Conventions

- **Branch**: Work on `claude/admiring-albattani-n71zsi`.
- **Secrets**: Only in `.env` / `.env.local` (gitignored). Production secrets in Heroku Config Vars / Vercel env.
- **MVP discipline**: Text-only interviews. NO voice mode, no company dashboard. Revenue features (SEO pages, content, AdSense) take priority over polish.
- **AdSense placement**: Only on results/practice/blog pages. NEVER on active interview or landing/login pages.
- **Performance**: Keep Lighthouse ≥90 (no heavy client libs). Dependencies pinned in requirements.txt.
