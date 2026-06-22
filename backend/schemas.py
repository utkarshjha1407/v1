from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class InterviewCreate(BaseModel):
    github_url: str
    interview_type: str = "swe"  # 'swe' | 'dsa'
    mode: Literal["text", "voice"] = "text"
    user_id: Optional[str] = None


class InterviewCreated(BaseModel):
    interview_id: str
    first_question: str
    audio_base64: Optional[str] = None


class MessageIn(BaseModel):
    content: str


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
    id: str
    interview_type: str
    mode: str
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


class VoiceMessageOut(BaseModel):
    transcript: str
    question: str
    question_number: int
    is_final: bool
    audio_base64: Optional[str] = None
