# InterviewAI

**Free, AI-powered mock interview platform for job seekers.** Get personalized technical interviews based on your real GitHub projects, receive instant scores (0–10), and get detailed feedback to improve your interview skills.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

InterviewAI bridges the gap between coding practice and interview preparation. Simply paste your GitHub URL, answer 5 tailored questions drawn from your actual project experience, and get an AI-generated score with constructive feedback—all for free.

Perfect for:
- 👨‍💻 Developers prepping for technical interviews
- 🚀 Portfolios with live GitHub projects
- 💡 Getting interview feedback without a human interviewer
- 🎯 Practice rounds before real interviews

## Features

- **GitHub-Powered Questions** — 5 interview questions generated from your actual repositories
- **Real-Time Scoring** — Instant 0–10 score with detailed feedback
- **Conversation-Style Interface** — Natural Q&A flow, not multiple choice
- **Anonymous Practice** — No account required to practice (optional Google sign-in coming)
- **Interview Transcripts** — View and share your full interview history and scores

## Tech Stack

| Component | Technology | Hosting |
|-----------|-----------|---------|
| Backend | FastAPI + SQLAlchemy + Groq LLM | Heroku |
| Frontend | Next.js 14 (Pages Router) + Tailwind CSS | Vercel |
| Database | PostgreSQL via Supabase | Supabase |
| Auth | Google OAuth (optional) | Supabase Auth |
| Infrastructure | ₹0 via GitHub Student Pack | - |

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- Git
- [Groq API key](https://console.groq.com) (free)

### Installation

**1. Clone and navigate to the project**
```bash
git clone <repo-url>
cd v1
```

**2. Set up the backend**
```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

**3. Set up the frontend**
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Defaults work for local development
```

### Running Locally

**Terminal 1: Start the backend**
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0
```

Backend runs on `http://localhost:8000`  
API docs available at `http://localhost:8000/docs`

**Terminal 2: Start the frontend**
```bash
cd frontend
npm run dev
```

Frontend opens at `http://localhost:3000`

**Note:** The app works anonymously without Supabase. Auth UI hides until env vars are set.

## Usage

1. Navigate to `http://localhost:3000`
2. Enter your GitHub URL (e.g., `https://github.com/username`)
3. Answer 5 interview questions about your projects
4. View your score, feedback, and transcript

## API Reference

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/github/profile?username=<user>` | GET | Fetch user's repositories |
| `/api/interviews` | POST | Start new interview |
| `/api/interviews/{id}` | GET | Get interview status & transcript |
| `/api/interviews/{id}/message` | POST | Submit answer, get next question |
| `/api/interviews/{id}/complete` | POST | Complete interview & get score |

### Request Examples

**Create an interview**
```bash
curl -X POST http://localhost:8000/api/interviews \
  -H 'Content-Type: application/json' \
  -d '{
    "github_url": "https://github.com/username/repo",
    "interview_type": "swe"
  }'
```

**Submit an answer**
```bash
curl -X POST http://localhost:8000/api/interviews/{id}/message \
  -H 'Content-Type: application/json' \
  -d '{"content": "Your answer here..."}'
```

**Get interview results**
```bash
curl http://localhost:8000/api/interviews/{id}
```

Full interactive docs at `http://localhost:8000/docs`

## Project Structure

```
.
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── routers/
│   │   ├── interviews.py       # Interview CRUD & messaging
│   │   ├── github_router.py    # GitHub profile fetching
│   │   └── ai.py               # Groq LLM integration
│   ├── models.py               # SQLAlchemy models
│   ├── schema.sql              # Supabase schema
│   ├── requirements.txt         # Python dependencies
│   └── Procfile                # Heroku deployment config
│
├── frontend/
│   ├── pages/
│   │   ├── index.tsx           # Landing page
│   │   ├── interview/[id].tsx  # Interview chat UI
│   │   └── results/[id].tsx    # Results & transcript
│   ├── lib/
│   │   ├── api.ts              # Typed API client
│   │   └── supabase.ts         # Supabase client
│   ├── package.json            # Node dependencies
│   └── tsconfig.json           # TypeScript config
│
└── README.md                    # This file
```

## Development

### Code Style
- Python: PEP 8, enforced via `flake8`
- TypeScript: ESLint + Prettier
- Use meaningful variable/function names; minimal comments

### Key Decisions
- **Interview flow**: Fixed 5-question loop for consistency
- **LLM backend**: Groq (fast, free tier sufficient)
- **Frontend routing**: Pages Router (simpler than App Router for this phase)
- **Database**: PostgreSQL via Supabase (relational, serverless)

### Environment Variables

**Backend (.env)**
```
GROQ_API_KEY=your_key_here
GROQ_QUESTION_MODEL=mixtral-8x7b-32768
GROQ_SCORING_MODEL=llama-3.3-70b-versatile
DATABASE_URL=postgresql://...  # Optional; SQLite used if not set
GITHUB_TOKEN=optional_github_pat
FRONTEND_ORIGIN=http://localhost:3000
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Roadmap

- [x] Phase 1: Backend core (GitHub scraping, interview Q&A, AI scoring)
- [x] Phase 2: Frontend (interview flow, results page)
- [ ] Phase 3: Production deployment (Heroku + Vercel + custom domain)
- [ ] Phase 4: Revenue features (SEO pages, blog, AdSense integration)

## Deployment

### Backend (Heroku)
```bash
heroku create your-app-name
heroku config:set GROQ_API_KEY=your_key
git push heroku main
```

`Procfile` is included for auto-detection. Set Config Vars for all environment variables.

### Frontend (Vercel)
```bash
npm install -g vercel
vercel
```

Set Environment Variables in Vercel dashboard matching `.env.local.example`.

### Database (Supabase)
1. Create Supabase project
2. Run `backend/schema.sql` in SQL editor
3. Set `DATABASE_URL` in backend env vars
4. Configure Google OAuth in Supabase Auth settings

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

## License

MIT License — see LICENSE file for details

## Support

- 📧 Issues: Open a GitHub issue
- 💬 Questions: Create a discussion

## Acknowledgments

- Built with [Groq](https://groq.com) for fast LLM inference
- GitHub Student Pack for free infra
- [Supabase](https://supabase.com) for serverless PostgreSQL
- [FastAPI](https://fastapi.tiangolo.com) and [Next.js](https://nextjs.org) communities
