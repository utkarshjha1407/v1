from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from db import get_db
from routers import ai
from routers.github_router import fetch_repos, username_from_url

router = APIRouter()

QUESTIONS_PER_INTERVIEW = 5


def _get_interview(db: Session, interview_id: str) -> models.Interview:
    interview = db.get(models.Interview, interview_id)
    if interview is None:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


def _history(interview: models.Interview) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in interview.messages]


@router.post("", response_model=schemas.InterviewCreated)
@router.post("/", response_model=schemas.InterviewCreated, include_in_schema=False)
async def create_interview(payload: schemas.InterviewCreate, db: Session = Depends(get_db)):
    if not payload.github_url and not payload.skill:
        raise HTTPException(status_code=422, detail="Provide either a GitHub URL or a skill")

    if payload.github_url:
        username = username_from_url(payload.github_url)
        repos = await fetch_repos(username)
        if not repos:
            raise HTTPException(
                status_code=422,
                detail="No public non-fork repos found — interview needs projects to discuss",
            )
        github_meta = {"username": username, "repos": repos}
        question = ai.next_question(repos, [], payload.interview_type)
    else:
        github_meta = {"skill": payload.skill}
        question = ai.skill_question(payload.skill, [], payload.interview_type)

    interview = models.Interview(
        user_id=payload.user_id,
        github_meta=github_meta,
        interview_type=payload.interview_type,
    )
    db.add(interview)
    db.flush()

    db.add(models.Message(interview_id=interview.id, role="assistant", content=question))
    db.commit()

    return schemas.InterviewCreated(interview_id=interview.id, first_question=question)


@router.get("/{interview_id}", response_model=schemas.InterviewOut)
def get_interview(interview_id: str, db: Session = Depends(get_db)):
    return _get_interview(db, interview_id)


@router.post("/{interview_id}/message", response_model=schemas.NextQuestion)
def send_message(interview_id: str, payload: schemas.MessageIn, db: Session = Depends(get_db)):
    interview = _get_interview(db, interview_id)
    if interview.status != "in_progress":
        raise HTTPException(status_code=409, detail="Interview is already completed")

    db.add(models.Message(interview_id=interview.id, role="user", content=payload.content))
    db.flush()
    db.refresh(interview)

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
        question = ai.skill_question(skill, _history(interview), interview.interview_type)
    else:
        question = ai.next_question(repos, _history(interview), interview.interview_type)
    db.add(models.Message(interview_id=interview.id, role="assistant", content=question))
    db.commit()

    return schemas.NextQuestion(
        question=question,
        question_number=asked + 1,
        is_final=asked + 1 >= QUESTIONS_PER_INTERVIEW,
    )


@router.post("/{interview_id}/complete", response_model=schemas.ScoreOut)
def complete_interview(interview_id: str, db: Session = Depends(get_db)):
    interview = _get_interview(db, interview_id)
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
