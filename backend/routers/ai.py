import asyncio
import json
import os

from fastapi import HTTPException
from groq import Groq

# Model names are env-overridable: Groq rotates models, so a decommissioned
# model can be swapped via config instead of a redeploy.
# Note: the plan's llama-3.1-70b-versatile was retired by Groq; 3.3 is its successor.
QUESTION_MODEL = os.getenv("GROQ_QUESTION_MODEL", "llama-3.1-8b-instant")
SCORING_MODEL = os.getenv("GROQ_SCORING_MODEL", "llama-3.3-70b-versatile")
TRANSCRIPTION_MODEL = os.getenv("GROQ_TRANSCRIPTION_MODEL", "whisper-large-v3-turbo")
TTS_MODEL = os.getenv("GROQ_TTS_MODEL", "playai-tts")
TTS_VOICE = os.getenv("GROQ_TTS_VOICE", "Fritz-PlayAI")

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
    "swe": "Focus on engineering decisions, trade-offs and design in THEIR projects.",
    "dsa": (
        "Focus on data structures and algorithms, but anchor each question in the "
        "kind of problems THEIR projects would face (scaling, lookups, parsing)."
    ),
}


def next_question(repos: list, history: list, interview_type: str = "swe") -> str:
    style = INTERVIEW_STYLES.get(interview_type, INTERVIEW_STYLES["swe"])
    system = (
        "You are a senior engineer interviewing a candidate. "
        f"Their GitHub projects: {json.dumps(repos)}. "
        f"{style} "
        "Ask ONE focused question under 50 words about THEIR projects, "
        "not generic textbook questions. No hints. "
        "If the candidate has already answered questions, build on their answers."
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
    result = json.loads(resp.choices[0].message.content)
    score = max(0, min(10, int(result.get("score", 0))))
    return {"score": score, "feedback": str(result.get("feedback", ""))}


def _transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    resp = get_client().audio.transcriptions.create(
        model=TRANSCRIPTION_MODEL,
        file=(filename, audio_bytes),
    )
    return resp.text.strip()


async def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    return await asyncio.to_thread(_transcribe_audio, audio_bytes, filename)


def _synthesize_speech(text: str) -> bytes:
    resp = get_client().audio.speech.create(
        model=TTS_MODEL,
        voice=TTS_VOICE,
        input=text,
        response_format="wav",
    )
    return resp.read()


async def synthesize_speech(text: str) -> bytes:
    return await asyncio.to_thread(_synthesize_speech, text)
