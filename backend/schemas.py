from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, BeforeValidator, Field

# Coerces UUID objects (returned by psycopg2 for uuid columns) to str
UUIDStr = Annotated[str, BeforeValidator(str)]


class InterviewCreate(BaseModel):
    github_url: Optional[str] = None
    skill: Optional[str] = None        # for skill-based mode (no GitHub needed)
    interview_type: str = "swe"        # 'swe' | 'dsa'
    user_id: Optional[str] = None


class InterviewCreated(BaseModel):
    interview_id: UUIDStr
    first_question: str


class MessageIn(BaseModel):
    # Cap answer length: bounds Groq latency/cost growth across the 5 questions
    # and closes a large-payload abuse vector.
    content: str = Field(min_length=1, max_length=8000)


class MessageOut(BaseModel):
    role: str
    content: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NextQuestion(BaseModel):
    question: str
    question_number: int
    is_final: bool


class InterviewOut(BaseModel):
    id: UUIDStr
    interview_type: str
    status: str
    score: Optional[int] = None
    feedback: Optional[str] = None
    created_at: Optional[datetime] = None
    messages: list[MessageOut] = []

    class Config:
        from_attributes = True


class ScoreOut(BaseModel):
    score: int
    feedback: str
