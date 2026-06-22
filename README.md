# InterviewAI

**Free, AI-powered mock interview platform.** Practice with 5 tailored questions built from your real GitHub projects, or pick any skill and get interviewed on it directly. Receive an instant 0–10 score with honest feedback.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**🚀 Live at [interviewai-beige.vercel.app](https://interviewai-beige.vercel.app)**

## Overview

InterviewAI gives you two ways to practice:

- **GitHub mode** — paste your profile URL and get questions drawn from your actual repos
- **Skill mode** — pick a topic (Python, System Design, DSA, …) and start immediately, no GitHub account needed

Both modes deliver 5 questions, a scored transcript, and a shareable results link. Everything runs on free-tier infrastructure.

## Features

- **Two interview modes** — GitHub-powered or skill-based (11 topics)
- **AI scoring** — Instant 0–10 score with 2–3 sentences of specific feedback
- **Conversation-style UI** — Natural Q&A flow, not multiple choice
- **Anonymous by default** — No account required; optional Google sign-in saves history
- **Shareable results** — Send your score link to anyone
- **Rate limited** — 5 interviews/IP/hour to prevent abuse
- **JWT-authenticated writes** — Signed-in users' interviews are protected from tampering

## Tech Stack

| Component | Technology | Hosting |
|-----------|-----------|---------|
| Backend | FastAPI + SQLAlchemy + Groq LLM | Heroku |
| Frontend | Next.js 14 (Pages Router) + Tailwind CSS | Vercel |
| Database | PostgreSQL via Supabase | Supabase |
| Auth | Google OAuth (optional) | Supabase Auth |
| Infrastructure | ₹0 via GitHub Student Pack | — |

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- [Groq API key](https://console.groq.com) (free)

### Installation

**1. Clone the repo**
```bash
git clone <repo-url>
cd v1
```

**2. Set up the backend**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — at minimum set GROQ_API_KEY
```

**3. Set up the frontend**
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Defaults work for local dev; add Supabase vars to enable Google sign-in
```

### Running Locally

**Terminal 1 — backend**
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0
```
> `--host 0.0.0.0` is required on WSL2 so the Windows browser can reach port 8000.

Backend: `http://localhost:8000` · API docs: `http://localhost:8000/docs`

**Terminal 2 — frontend**
```bash
cd frontend
npm run dev
```

Frontend: `http://localhost:3000`

The app works fully without Supabase — auth UI hides until the env vars are set.

## Skill Topics

| Key | Topic |
|-----|-------|
| `python` | Python internals, async/await, GIL, packaging |
| `javascript` | JS/TS event loop, closures, type system |
| `java` | OOP, JVM, concurrency, Spring |
| `go` | Goroutines, channels, interfaces, error handling |
| `react` | Component design, state management, rendering |
| `nodejs` | Event-driven I/O, streams, scaling |
| `system_design` | Distributed systems, scalability, caching |
| `dsa` | Complexity, sorting, trees, graphs, DP |
| `databases` | SQL vs NoSQL, indexing, transactions |
| `devops` | Docker, Kubernetes, CI/CD, monitoring |
| `ml` | Model training, evaluation, deployment, MLOps |

## API Reference

| Endpoint | Method | Auth required | Description |
|----------|--------|--------------|-------------|
| `/api/health` | GET | — | Health check |
| `/api/github/profile?username=<u>` | GET | — | Fetch user's repos |
| `/api/interviews` | POST | — (5/hour rate limit) | Start interview |
| `/api/interviews/{id}` | GET | — | Get status & transcript |
| `/api/interviews/{id}/message` | POST | Owner if signed in | Submit answer |
| `/api/interviews/{id}/complete` | POST | Owner if signed in | Score & complete |

### Examples

**GitHub-based interview**
```bash
curl -X POST http://localhost:8000/api/interviews \
  -H 'Content-Type: application/json' \
  -d '{"github_url": "https://github.com/username", "interview_type": "swe"}'
```

**Skill-based interview**
```bash
curl -X POST http://localhost:8000/api/interviews \
  -H 'Content-Type: application/json' \
  -d '{"skill": "system_design"}'
```

**Submit an answer**
```bash
curl -X POST http://localhost:8000/api/interviews/{id}/message \
  -H 'Content-Type: application/json' \
  -d '{"content": "Your answer here…"}'
```

Full interactive docs at `http://localhost:8000/docs`

## Project Structure

```
.
├── backend/
│   ├── main.py                 # FastAPI app, CORS, rate-limit handler
│   ├── auth.py                 # Supabase JWT decode + access guard
│   ├── limiter.py              # slowapi Limiter instance
│   ├── db.py                   # SQLAlchemy engine + session
│   ├── models.py               # ORM models (User, Interview, Message)
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── schema.sql              # Supabase SQL editor schema
│   ├── requirements.txt
│   ├── Procfile                # Heroku web dyno
│   └── routers/
│       ├── interviews.py       # Interview CRUD, Q&A loop, scoring
│       ├── github_router.py    # GitHub REST API fetch
│       └── ai.py               # Groq LLM calls (questions + scoring)
│
└── frontend/
    ├── pages/
    │   ├── index.tsx           # Landing — GitHub / skill mode toggle
    │   ├── interview/[id].tsx  # Live chat UI
    │   └── results/[id].tsx    # Score, feedback, transcript, share
    └── lib/
        ├── api.ts              # Typed Axios client + JWT interceptor
        └── supabase.ts         # Supabase client (null-safe)
```

## Environment Variables

**Backend (`backend/.env`)**

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Free at console.groq.com |
| `DATABASE_URL` | No | Supabase connection string; SQLite used locally if unset |
| `SUPABASE_JWT_SECRET` | No | Enables per-user auth on interview endpoints (Supabase → Settings → API → JWT Secret) |
| `FRONTEND_ORIGIN` | No | Production frontend URL added to CORS allowlist |
| `SENTRY_DSN` | No | Error tracking (Phase 3) |
| `GROQ_QUESTION_MODEL` | No | Default: `llama-3.1-8b-instant` |
| `GROQ_SCORING_MODEL` | No | Default: `llama-3.3-70b-versatile` |

**Frontend (`frontend/.env.local`)**

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend URL; defaults to `http://localhost:8000` |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Enables Google sign-in |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Enables Google sign-in |

## Roadmap

- [x] Phase 1 — Backend: interview flow, GitHub fetch, AI scoring
- [x] Phase 2 — Frontend: landing, chat UI, results page
- [x] Skill-based interview mode (no GitHub needed)
- [x] Security hardening: rate limiting, JWT auth, async Groq calls
- [x] User test gate: 5 complete self-interviews
- [x] Supabase: schema, Google OAuth, auth trigger
- [x] Phase 3 — Deployed: Railway (backend) + Vercel (frontend)
- [ ] Phase 4 — Revenue: SEO practice pages, blog, AdSense (~week 9)

## Deployment

### Current production setup
| Service | Platform | URL |
|---------|----------|-----|
| Backend | Railway | `https://zealous-renewal-production-63ac.up.railway.app` |
| Frontend | Vercel | `https://interviewai-beige.vercel.app` |
| Database | Supabase | `ccmjkmltyaledfonbcon.supabase.co` |

### Backend (Railway)
```bash
npm install -g @railway/cli   # or: curl -fsSL cli.new/install | sh
railway login
cd backend && railway up
```
Set env vars via `railway variables set KEY=value` — see `.env.example` for the full list.

### Frontend (Vercel)
```bash
cd frontend && npx vercel --prod
```
Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables in the Vercel dashboard before deploying.

### Database (Supabase)
1. Create a Supabase project
2. Run `backend/schema.sql` in the SQL editor
3. Enable Google OAuth under Authentication → Providers
4. Copy the connection string (transaction pooler, port 6543) into `DATABASE_URL`
5. Copy the JWT Secret into `SUPABASE_JWT_SECRET`

## License

MIT — see LICENSE for details.

## Acknowledgments

- [Groq](https://groq.com) for fast, free LLM inference
- [Supabase](https://supabase.com) for serverless PostgreSQL and auth
- GitHub Student Pack for zero-cost infra
- [FastAPI](https://fastapi.tiangolo.com) and [Next.js](https://nextjs.org) communities