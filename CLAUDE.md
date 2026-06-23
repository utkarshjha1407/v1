# InterviewAI — CLAUDE.md

Free, ad-supported AI mock-interview platform. Job seekers paste their GitHub
URL (or pick a skill) and get a 5-question interview — text or voice —
personalised from their real repos, then a 0–10 score with feedback. Solo
project, currently pivoting toward the voice-interview differentiator before
resuming the revenue plan (AdSense → freelance leads → paid company tier →
institutions).

## Project status (update as phases complete)

- [x] Phase 1 — Backend (FastAPI): all endpoints built and flow-tested
- [x] Phase 2 — Frontend (Next.js): full interview flow, production build passes
- [x] User test gate: 5 complete self-interviews on localhost
- [x] Supabase project: schema + Google OAuth (run `backend/schema.sql`)
- [x] Phase 3 — Deployed: Railway (backend) + Vercel (frontend)
- [~] Phase 4 — Revenue (PAUSED for the voice pivot): 6 SEO `/practice/[topic]`
      pages, 12 blog posts, privacy/about/contact pages, sitemap, Search
      Console, AdSense (apply ~week 9)
- [ ] Phase 5 — Voice interview mode (Mercor-style, solo practice tool, no
      employer/marketplace side yet):
  - [x] `mode` column on `Interview` (`text` | `voice`, default `text`)
  - [x] `ai.transcribe_audio` (Groq Whisper) / `ai.synthesize_speech` (Groq
        PlayAI TTS), env-overridable model/voice
  - [x] `POST /api/interviews/{id}/voice-message` endpoint, shares the
        5-question loop via `_advance_interview`
  - [x] Frontend: mode toggle on landing page, `VoiceInterview` component
        (record/playback), wired into `interview/[id]`
  - [ ] User test gate: 5 complete self-interviews in voice mode on localhost

## Architecture

- `backend/` — FastAPI + SQLAlchemy. Deployed on Railway (railway.toml present;
  Procfile kept for local/Heroku-style runs).
  - `main.py` app + CORS (localhost:3000 + `FRONTEND_ORIGIN` env) + Sentry hook
    + slowapi rate-limit handler
  - `routers/interviews.py` create / get / message / voice-message / complete.
    GitHub mode and skill mode (`SKILL_TOPICS` allowlist in `ai.py`) both flow
    through `_advance_interview`, shared by `message` and `voice-message`
    (sentinel "last question" reply is NOT stored in DB — max 5 assistant
    msgs). Rate-limited (`5/hour` create, `60/hour` voice-message) via
    `limiter.py`. Access control + optional JWT identity via `auth.py`.
  - `routers/github_router.py` repo fetch via GitHub REST (skips forks)
  - `routers/ai.py` Groq calls; models env-overridable (`GROQ_QUESTION_MODEL`,
    `GROQ_SCORING_MODEL`). Scoring uses llama-3.3-70b-versatile because Groq
    retired the 3.1-70b model the original plan named.
    Voice mode adds `transcribe_audio` (Whisper, `GROQ_TRANSCRIPTION_MODEL`)
    and `synthesize_speech` (PlayAI TTS, `GROQ_TTS_MODEL` / `GROQ_TTS_VOICE`),
    both run via `asyncio.to_thread` since the Groq SDK call is sync.
  - DB: Postgres (Supabase) via `DATABASE_URL`; falls back to SQLite locally.
    `schema.sql` mirrors `models.py` for the Supabase SQL editor — includes an
    `alter table ... add column if not exists` for `mode` since the table
    already exists in production.
- `frontend/` — Next.js 14 **Pages Router** + Tailwind + strict TS. Deployed
  on Vercel.
  - `lib/api.ts` typed client; `NEXT_PUBLIC_API_URL` (default localhost:8000)
  - `lib/supabase.ts` returns null when env vars unset → auth UI hides and the
    app works anonymously. Keep this graceful-degradation behaviour.
  - Pages: `index` (landing, GitHub/skill toggle + text/voice toggle),
    `interview/[id]` (chat UI; branches to `components/VoiceInterview.tsx`
    for `mode === "voice"`, sharing the message bubble list and the
    finish/score button with text mode — both modes use optimistic local
    state updates rather than re-fetching after each answer), `results/[id]`
    (score + transcript + share). Phase 4 (paused) would add
    `practice/[topic]`, `blog/[slug]`, `privacy`, `about`, `contact`.
  - Voice mode's first-question audio only comes back from the `create`
    response, so `index.tsx` stashes it in `sessionStorage` keyed by
    `interview-audio-{id}` right before navigating to `interview/[id]`.

## Commands

- Backend: `cd backend && source .venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0`
  (WSL2 requires `--host 0.0.0.0` so the Windows browser can reach port 8000)
  (first time: `python3 -m venv .venv && pip install -r requirements.txt`,
  copy `.env.example` → `.env`, set `GROQ_API_KEY`, optionally `GITHUB_TOKEN`)
- Frontend: `cd frontend && npm install && npm run dev` → localhost:3000
- Verify frontend compiles: `cd frontend && npm run build`
- API docs while backend runs: localhost:8000/docs

## Conventions & guardrails

- Branch: work on `claude/voice-interview-mode`.
- Secrets only in `backend/.env` / `frontend/.env.local` (gitignored). Never
  commit keys; production secrets go in Railway/Vercel env vars.
- MVP discipline (from the plan): solo job-seeker practice tool only — no
  video/webcam, no employer/marketplace side, no company dashboard, minimal
  styling. Revenue features (SEO pages, content, AdSense plumbing) are
  paused while the voice pivot (Phase 5) is underway.
- AdSense placement rules: ads on results/practice/blog pages only; NEVER on
  the active interview page or landing/login.
- Pin dependency versions in requirements.txt; keep Lighthouse ≥90 (no heavy
  client libs). Voice mode intentionally uses only native browser APIs
  (`MediaRecorder`/`getUserMedia`/`<audio>`) — no new frontend dependencies.

## Roadmap reference

Full plan lives in the owner's document "InterviewAI Revenue Plan v2" (Student
Pack edition): ₹0 infra, 12-week build, AdSense application at ~week 9 (needs
custom domain, 15+ original content pages, ~100 visitors/day, privacy/about/
contact pages). Next concrete steps are the unchecked boxes above.
