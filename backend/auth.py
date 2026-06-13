import os
from typing import Optional

import jwt
from fastapi import Header, HTTPException


def get_caller_user_id(authorization: Optional[str] = Header(default=None)) -> Optional[str]:
    """Decode Supabase JWT and return the user's UUID (sub claim).
    Returns None when SUPABASE_JWT_SECRET is unset or no token is present,
    so anonymous interviews still work in local dev.
    """
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret or not authorization:
        return None
    try:
        scheme, token = authorization.split(" ", 1)
        if scheme.lower() != "bearer":
            return None
        payload = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
        return payload.get("sub")
    except Exception:
        return None


def check_interview_access(interview_user_id: Optional[str], caller_id: Optional[str]) -> None:
    """Raise 403 if the interview is owned by someone other than the caller."""
    if interview_user_id and caller_id != interview_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
