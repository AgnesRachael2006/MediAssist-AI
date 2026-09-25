from datetime import datetime, timezone

from fastapi import HTTPException

from app.db import one, rows


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def level(user: dict, patient_id: str) -> str | None:
    if user["role"] == "patient" and user["profile_id"] == patient_id:
        return "own"
    if user["role"] != "doctor":
        return None
    if rows("reports", {"patient_id": patient_id, "doctor_id": user["profile_id"]}):
        return "treating"
    share = _active_share(patient_id, user["profile_id"])
    return "shared" if share else None


def require_patient_access(user: dict, patient_id: str) -> str:
    found = level(user, patient_id)
    if not found:
        raise HTTPException(status_code=403, detail="Forbidden")
    return found


def require_treating(user: dict, patient_id: str) -> None:
    if level(user, patient_id) != "treating":
        raise HTTPException(status_code=403, detail="Forbidden")


def _active_share(patient_id: str, doctor_id: str) -> dict | None:
    matches = rows("record_shares", {"patient_id": patient_id, "shared_with_doctor_id": doctor_id})
    current = datetime.now(timezone.utc)
    for share in matches:
        if share.get("status") == "REVOKED" or share.get("revoked_at"):
            continue
        expires = datetime.fromisoformat(share["expires_at"].replace("Z", "+00:00"))
        if expires > current:
            return share
    return None


def doctor_name(doctor_id: str | None) -> str | None:
    if not doctor_id:
        return None
    doctor = one("doctors", {"id": doctor_id})
    return doctor["name"] if doctor else doctor_id
