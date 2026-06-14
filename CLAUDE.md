# InterviewAI — CLAUDE.md

Free, ad-supported AI mock-interview platform. Job seekers paste their GitHub
URL and get a 5-question text interview personalised from their real repos,
then a 0–10 score with feedback. Solo project following a revenue-first plan
(AdSense → freelance leads → paid company tier → institutions).

## Project status (update as phases complete)

- [x] Phase 1 — Backend (FastAPI): all endpoints built and flow-tested
- [x] Phase 2 — Frontend (Next.js): full interview flow, production build passes
- [x] User test gate: 5 complete self-interviews on localhost
- [x] Supabase project: schema + Google OAuth (run `backend/schema.sql`)
- [ ] Phase 3 — Deploy: Heroku (backend) + Vercel (frontend) + Name.com domain + Sentry
- [ ] Phase 4 — Revenue: 6 SEO `/practice/[topic]` pages, 12 blog posts,
      privacy/about/contact pages, sitemap, Search Console, AdSense (apply ~week 9)

## Architecture

- `backend/` — FastAPI + SQLAlchemy. Heroku target (Procfile present).
  - `main.py` app + CORS (localhost:3000 + `FRONTEND_ORIGIN` env) + Sentry hook
  - `routers/interviews.py` create / get / message / complete (5-question loop;
    sentinel "last question" reply is NOT stored in DB — max 5 assistant msgs)
  - `routers/github_router.py` repo fetch via GitHub REST (skips forks)
  - `routers/ai.py` Groq calls; models env-overridable (`GROQ_QUESTION_MODEL`,
    `GROQ_SCORING_MODEL`). Scoring uses llama-3.3-70b-versatile because Groq
    retired the 3.1-70b model the original plan named.
  - DB: Postgres (Supabase) via `DATABASE_URL`; falls back to SQLite locally.
    `schema.sql` mirrors `models.py` for the Supabase SQL editor.
- `frontend/` — Next.js 14 **Pages Router** + Tailwind + strict TS. Vercel target.
  - `lib/api.ts` typed client; `NEXT_PUBLIC_API_URL` (default localhost:8000)
  - `lib/supabase.ts` returns null when env vars unset → auth UI hides and the
    app works anonymously. Keep this graceful-degradation behaviour.
  - Pages: `index` (landing), `interview/[id]` (chat UI), `results/[id]`
    (score + transcript + share). Phase 4 adds `practice/[topic]`, `blog/[slug]`,
    `privacy`, `about`, `contact`.

## Commands

- Backend: `cd backend && source .venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0`
  (WSL2 requires `--host 0.0.0.0` so the Windows browser can reach port 8000)
  (first time: `python3 -m venv .venv && pip install -r requirements.txt`,
  copy `.env.example` → `.env`, set `GROQ_API_KEY`)
- Frontend: `cd frontend && npm install && npm run dev` → localhost:3000
- Verify frontend compiles: `cd frontend && npm run build`
- API docs while backend runs: localhost:8000/docs

## Conventions & guardrails

- Branch: work on `claude/admiring-albattani-n71zsi` (currently the default).
- Secrets only in `backend/.env` / `frontend/.env.local` (gitignored). Never
  commit keys; production secrets go in Heroku Config Vars / Vercel env.
- MVP discipline (from the plan): text-only interviews — NO voice mode, no
  company dashboard yet, minimal styling. Revenue features (SEO pages,
  content, AdSense plumbing) take priority over polish.
- AdSense placement rules: ads on results/practice/blog pages only; NEVER on
  the active interview page or landing/login.
- Pin dependency versions in requirements.txt; keep Lighthouse ≥90 (no heavy
  client libs).

## Roadmap reference

Full plan lives in the owner's document "InterviewAI Revenue Plan v2" (Student
Pack edition): ₹0 infra, 12-week build, AdSense application at ~week 9 (needs
custom domain, 15+ original content pages, ~100 visitors/day, privacy/about/
contact pages). Next concrete steps are the unchecked boxes above.
