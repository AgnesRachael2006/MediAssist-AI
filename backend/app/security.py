import hashlib
import hmac
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Header, HTTPException

from app.config import settings

DEMO_PASSWORD = "demo"


def hash_password(password: str) -> str:
    salt = "mediassist-demo-salt"
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000)
    return digest.hex()


def password_ok(stored_hash: str, password: str, email: str) -> bool:
    if not password:
        return False
    if hmac.compare_digest(stored_hash, hash_password(password)):
        return True
    return settings.demo_allow_any_password and email.endswith("@mediassist.demo")


def issue_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "role": user["role"],
        "profile_id": user["profile_id"],
        "name": user["full_name"],
        "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, settings.session_secret, algorithm="HS256")


def current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in required")
    token = authorization.split(" ", 1)[1]
    try:
        return jwt.decode(token, settings.session_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Sign in required") from exc


def require_role(user: dict, role: str) -> None:
    if user.get("role") != role:
        raise HTTPException(status_code=403, detail="Forbidden")


def require_patient(user: dict) -> None:
    require_role(user, "patient")


def require_doctor(user: dict) -> None:
    require_role(user, "doctor")


def require_admin(user: dict) -> None:
    require_role(user, "admin")
