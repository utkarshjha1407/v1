import asyncio
import base64
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session, selectinload

import models
import schemas
from auth import check_interview_access, get_caller_user_id
from db import get_db
from limiter import limiter
from routers import ai
from routers.github_router import fetch_repos, username_from_url

router = APIRouter()

QUESTIONS_PER_INTERVIEW = 5


def _get_interview(db: Session, interview_id: str) -> models.Interview:
    interview = db.get(models.Interview, interview_id)
    if interview is None:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


def _get_interview_with_messages(db: Session, interview_id: str) -> models.Interview:
    interview = (
        db.query(models.Interview)
        .options(selectinload(models.Interview.messages))
        .filter(models.Interview.id == interview_id)
        .first()
    )
    if interview is None:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


def _history(interview: models.Interview) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in interview.messages]


def _advance_interview(db: Session, interview: models.Interview, content: str) -> schemas.NextQuestion:
    # Build the LLM history from already-loaded messages + the new answer,
    # without a round-trip to re-read it back.
    history = _history(interview)
    history.append({"role": "user", "content": content})
    db.add(models.Message(interview_id=interview.id, role="user", content=content))

    asked = sum(1 for m in interview.messages if m.role == "assistant")
    if asked >= QUESTIONS_PER_INTERVIEW:
        db.commit()
        return schemas.NextQuestion(
            question="That was the last question — submit the interview to get your score.",
            question_number=asked,
            is_final=True,
        )

    meta = interview.github_meta or {}
    skill = meta.get("skill")
    repos = meta.get("repos", [])
    if skill:
        question = ai.skill_question(skill, history, interview.interview_type)
    else:
        question = ai.next_question(repos, history, interview.interview_type)
    db.add(models.Message(interview_id=interview.id, role="assistant", content=question))
    db.commit()

    return schemas.NextQuestion(
        question=question,
        question_number=asked + 1,
        is_final=asked + 1 >= QUESTIONS_PER_INTERVIEW,
    )


@router.post("", response_model=schemas.InterviewCreated)
@router.post("/", response_model=schemas.InterviewCreated, include_in_schema=False)
@limiter.limit("5/hour")
async def create_interview(
    request: Request,
    payload: schemas.InterviewCreate,
    db: Session = Depends(get_db),
    caller_id: Optional[str] = Depends(get_caller_user_id),
):
    if not payload.github_url and not payload.skill:
        raise HTTPException(status_code=422, detail="Provide either a GitHub URL or a skill")

    # Restrict skill mode to the known allowlist — an arbitrary skill string would
    # otherwise be injected straight into the LLM system prompt.
    if payload.skill and payload.skill.lower() not in ai.SKILL_TOPICS:
        raise HTTPException(status_code=422, detail="Unknown skill")

    # Prefer identity from the verified JWT over the client-supplied field.
    effective_user_id = caller_id or payload.user_id

    if payload.github_url:
        username = username_from_url(payload.github_url)
        repos = await fetch_repos(username)
        if not repos:
            raise HTTPException(
                status_code=422,
                detail="No public non-fork repos found — interview needs projects to discuss",
            )
        github_meta = {"username": username, "repos": repos}
        question = await asyncio.to_thread(ai.next_question, repos, [], payload.interview_type)
    else:
        github_meta = {"skill": payload.skill}
        question = await asyncio.to_thread(ai.skill_question, payload.skill, [], payload.interview_type)

    if effective_user_id:
        user = db.get(models.User, effective_user_id)
        if not user:
            db.add(models.User(id=effective_user_id, github_url=payload.github_url))
        elif payload.github_url and not user.github_url:
            user.github_url = payload.github_url
        db.flush()

    interview = models.Interview(
        user_id=effective_user_id,
        github_meta=github_meta,
        interview_type=payload.interview_type,
        mode=payload.mode,
    )
    db.add(interview)
    db.flush()

    db.add(models.Message(interview_id=interview.id, role="assistant", content=question))
    db.commit()

    audio_base64 = None
    if payload.mode == "voice":
        audio_base64 = base64.b64encode(await ai.synthesize_speech(question)).decode()

    return schemas.InterviewCreated(
        interview_id=interview.id, first_question=question, audio_base64=audio_base64
    )


@router.get("/{interview_id}", response_model=schemas.InterviewOut)
def get_interview(interview_id: str, db: Session = Depends(get_db)):
    return _get_interview(db, interview_id)


@router.post("/{interview_id}/message", response_model=schemas.NextQuestion)
def send_message(
    interview_id: str,
    payload: schemas.MessageIn,
    db: Session = Depends(get_db),
    caller_id: Optional[str] = Depends(get_caller_user_id),
):
    interview = _get_interview_with_messages(db, interview_id)
    check_interview_access(interview.user_id, caller_id)

    if interview.status != "in_progress":
        raise HTTPException(status_code=409, detail="Interview is already completed")

    return _advance_interview(db, interview, payload.content)


@router.post("/{interview_id}/voice-message", response_model=schemas.VoiceMessageOut)
@limiter.limit("60/hour")
async def send_voice_message(
    request: Request,
    interview_id: str,
    file: UploadFile,
    db: Session = Depends(get_db),
    caller_id: Optional[str] = Depends(get_caller_user_id),
):
    interview = _get_interview_with_messages(db, interview_id)
    check_interview_access(interview.user_id, caller_id)

    if interview.status != "in_progress":
        raise HTTPException(status_code=409, detail="Interview is already completed")

    audio_bytes = await file.read()
    transcript = await ai.transcribe_audio(audio_bytes, file.filename or "answer.webm")

    # _advance_interview does a blocking Groq call + DB commit; offload it so
    # this async endpoint doesn't block the event loop (mirrors create_interview).
    next_q = await asyncio.to_thread(_advance_interview, db, interview, transcript)

    audio_base64 = None
    if not next_q.is_final:
        audio_base64 = base64.b64encode(await ai.synthesize_speech(next_q.question)).decode()

    return schemas.VoiceMessageOut(
        transcript=transcript,
        question=next_q.question,
        question_number=next_q.question_number,
        is_final=next_q.is_final,
        audio_base64=audio_base64,
    )


@router.post("/{interview_id}/complete", response_model=schemas.ScoreOut)
def complete_interview(
    interview_id: str,
    db: Session = Depends(get_db),
    caller_id: Optional[str] = Depends(get_caller_user_id),
):
    interview = _get_interview(db, interview_id)
    check_interview_access(interview.user_id, caller_id)

    if interview.status == "completed":
        return schemas.ScoreOut(score=interview.score, feedback=interview.feedback)

    history = _history(interview)
    if not any(m["role"] == "user" for m in history):
        raise HTTPException(status_code=422, detail="No answers to score yet")

    result = ai.score_interview(history)
    interview.score = result["score"]
    interview.feedback = result["feedback"]
    interview.status = "completed"
    db.commit()

    return schemas.ScoreOut(**result)
