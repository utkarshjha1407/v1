import os

import sentry_sdk
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.1)

from db import Base, engine  # noqa: E402
import models  # noqa: E402, F401  — registers tables on Base
from routers import github_router, interviews  # noqa: E402

Base.metadata.create_all(bind=engine)

app = FastAPI(title="InterviewAI API")

# Production domain gets added here in Phase 3 (set FRONTEND_ORIGIN on Heroku).
allowed_origins = ["http://localhost:3000"]
if os.getenv("FRONTEND_ORIGIN"):
    allowed_origins.append(os.getenv("FRONTEND_ORIGIN"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interviews.router, prefix="/api/interviews", tags=["interviews"])
app.include_router(github_router.router, prefix="/api/github", tags=["github"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
