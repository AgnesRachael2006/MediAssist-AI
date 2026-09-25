import httpx

from app.config import settings

BLOCKED_HINT = (
    "Write one sentence only. Say whether the value is inside or outside the printed reference range. "
    "Do not name a disease. Do not prescribe. Do not say the patient has a condition."
)


def configured() -> bool:
    return bool(settings.gemini_api_key.strip())


def generate(prompt: str) -> str | None:
    if not configured():
        return None
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    response = httpx.post(
        url,
        params={"key": settings.gemini_api_key},
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    parts = data["candidates"][0]["content"]["parts"]
    return "".join(part.get("text", "") for part in parts).strip()


def draft_for_row(row: dict) -> str | None:
    prompt = (
        f"{BLOCKED_HINT}\n"
        f"Test: {row.get('test_name')}\n"
        f"Value: {row.get('value')} {row.get('unit') or ''}\n"
        f"Reference: {row.get('reference_range') or 'missing'}\n"
    )
    return generate(prompt)


def rewrite_text(row: dict, style: str) -> str | None:
    prompt = (
        f"{BLOCKED_HINT}\nStyle: {style}.\n"
        f"Test: {row.get('test_name')} {row.get('value')} {row.get('unit') or ''}. "
        f"Reference: {row.get('reference_range') or 'missing'}."
    )
    return generate(prompt)


def explain_approved(question: str, approved_text: str) -> str | None:
    prompt = (
        "Answer only from the doctor-approved text below. "
        "If the question asks for a diagnosis, dose, or treatment, refuse. "
        "Do not add new medical claims.\n"
        f"Approved text:\n{approved_text}\n\nQuestion: {question}"
    )
    return generate(prompt)
