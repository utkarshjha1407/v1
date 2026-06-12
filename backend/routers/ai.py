import json
import os

from fastapi import HTTPException
from groq import Groq

QUESTION_MODEL = os.getenv("GROQ_QUESTION_MODEL", "llama-3.1-8b-instant")
SCORING_MODEL = os.getenv("GROQ_SCORING_MODEL", "llama-3.3-70b-versatile")

_client = None


def get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=503, detail="GROQ_API_KEY is not configured")
        _client = Groq(api_key=api_key)
    return _client


INTERVIEW_STYLES = {
    "swe": "Focus on engineering decisions, trade-offs and design.",
    "dsa": (
        "Focus on data structures and algorithms, anchored in real-world "
        "problems like scaling, lookups, and parsing."
    ),
}

SKILL_TOPICS = {
    "python": "Python — language internals, async/await, GIL, packaging, performance optimisation",
    "javascript": "JavaScript/TypeScript — event loop, closures, type system, modern ES features",
    "java": "Java — OOP, JVM internals, concurrency, Spring ecosystem, memory management",
    "go": "Go — goroutines, channels, interfaces, error handling, performance",
    "react": "React/Frontend — component design, state management, rendering, performance",
    "nodejs": "Node.js/Backend — event-driven I/O, streams, Express/Fastify, scaling",
    "system_design": "System Design — distributed systems, scalability, databases, caching, APIs",
    "dsa": "Data Structures & Algorithms — complexity, sorting, trees, graphs, dynamic programming",
    "databases": "Database Design — SQL vs NoSQL, indexing, transactions, query optimisation",
    "devops": "DevOps — Docker, Kubernetes, CI/CD, monitoring, infrastructure as code",
    "ml": "Machine Learning — model training, evaluation, deployment, MLOps",
}


def next_question(repos: list, history: list, interview_type: str = "swe") -> str:
    style = INTERVIEW_STYLES.get(interview_type, INTERVIEW_STYLES["swe"])
    system = (
        "You are a senior engineer interviewing a candidate. "
        f"Their GitHub projects: {json.dumps(repos)}. "
        f"{style} "
        "Ask ONE focused question under 50 words about THEIR projects, "
        "not generic textbook questions. No hints. "
        "Build on prior answers if any."
    )
    resp = get_client().chat.completions.create(
        model=QUESTION_MODEL,
        messages=[{"role": "system", "content": system}] + history,
        max_tokens=200,
    )
    return resp.choices[0].message.content.strip()


def skill_question(skill: str, history: list, interview_type: str = "swe") -> str:
    topic = SKILL_TOPICS.get(skill.lower(), f"{skill} programming and best practices")
    style = INTERVIEW_STYLES.get(interview_type, INTERVIEW_STYLES["swe"])
    system = (
        "You are a senior engineer conducting a technical interview. "
        f"Topic: {topic}. {style} "
        "Ask ONE sharp, specific question under 60 words. No hints. "
        "Build on prior answers if any. Do not repeat previous questions."
    )
    resp = get_client().chat.completions.create(
        model=QUESTION_MODEL,
        messages=[{"role": "system", "content": system}] + history,
        max_tokens=200,
    )
    return resp.choices[0].message.content.strip()


def score_interview(history: list) -> dict:
    prompt = (
        "Review this mock-interview transcript and judge the candidate's answers. "
        'Return JSON only: {"score": <0-10 integer>, "feedback": "<2-3 sentences of '
        'specific, constructive feedback>"} '
        f"Transcript: {json.dumps(history)}"
    )
    resp = get_client().chat.completions.create(
        model=SCORING_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=300,
    )
    try:
        result = json.loads(resp.choices[0].message.content)
        score = max(0, min(10, int(result.get("score", 5))))
        feedback = str(result.get("feedback", "Interview completed."))
    except (json.JSONDecodeError, ValueError, TypeError):
        score = 5
        feedback = "Could not parse detailed feedback — interview completed."
    return {"score": score, "feedback": feedback}