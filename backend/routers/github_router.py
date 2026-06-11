import os
import re

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

GITHUB_API = "https://api.github.com"


def username_from_url(github_url: str) -> str:
    """Extract the username from a GitHub profile URL or bare username."""
    match = re.search(r"github\.com/([A-Za-z0-9-]+)", github_url)
    if match:
        return match.group(1)
    candidate = github_url.strip().strip("/")
    if re.fullmatch(r"[A-Za-z0-9-]+", candidate):
        return candidate
    raise HTTPException(status_code=422, detail="Could not parse GitHub username from URL")


async def fetch_repos(username: str) -> list[dict]:
    """Fetch a user's repos via the GitHub REST API, keeping only interview-relevant fields."""
    headers = {"Accept": "application/vnd.github+json"}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{GITHUB_API}/users/{username}/repos",
            headers=headers,
            params={"per_page": 30, "sort": "updated"},
        )

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"GitHub user '{username}' not found")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"GitHub API error ({resp.status_code})")

    return [
        {
            "name": r["name"],
            "description": r["description"],
            "stars": r["stargazers_count"],
            "language": r["language"],
        }
        for r in resp.json()
        if not r["fork"]
    ]


@router.get("/profile")
async def get_github_profile(username: str):
    return await fetch_repos(username_from_url(username))
