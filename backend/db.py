import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Supabase gives a postgres:// URL; SQLAlchemy needs postgresql://
# Falls back to a local SQLite file so the app runs before Supabase is wired up.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local.db").replace(
    "postgres://", "postgresql://", 1
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
