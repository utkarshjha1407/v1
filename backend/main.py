import os

import sentry_sdk
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

load_dotenv()

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.1)

from db import Base, engine  # noqa: E402
import models  # noqa: E402, F401  — registers tables on Base
from routers import github_router, interviews  # noqa: E402
from limiter import limiter  # noqa: E402

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[warning] Could not run create_all — DB may be unreachable at startup: {e}")

app = FastAPI(title="InterviewAI API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allow localhost plus any explicitly configured frontend origins.
# Vercel deployments commonly use different domains per project/branch, so
# accept the common *.vercel.app pattern as well.
allowed_origins = ["http://localhost:3000"]
for raw_origin in os.getenv("FRONTEND_ORIGIN", "").split(","):
    origin = raw_origin.strip()
    if origin:
        allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app$",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interviews.router, prefix="/api/interviews", tags=["interviews"])
app.include_router(github_router.router, prefix="/api/github", tags=["github"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
