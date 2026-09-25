"""Overall report summary. It restates printed results and does not add a diagnosis."""

from app.gemini_client import configured, generate
from app.jev import BLOCKED, DISCLAIMER, evaluate


def report_summary(rows: list[dict]) -> str:
    factual = _factual(rows)
    if not configured():
        return factual
    try:
        drafted = generate(
            "Rewrite the facts below as one short paragraph for the patient. "
            "Use only these facts. Do not name a disease. Do not prescribe. "
            "Do not say the patient has a condition. End with: This is not a diagnosis.\n"
            f"{factual}"
        )
    except Exception:
        drafted = None
    if not drafted or _blocked(drafted):
        return factual
    if "not a diagnosis" not in drafted.lower():
        drafted = drafted.rstrip() + " This is not a diagnosis."
    return drafted


def _factual(rows: list[dict]) -> str:
    if not rows:
        return "No laboratory rows could be read from this report. This is not a diagnosis."
    flagged = []
    for row in rows:
        decision = evaluate(row, "")
        label = f"{row.get('test_name')} {row.get('value')} {row.get('unit') or ''}".strip()
        if decision["triage"] == "insufficient":
            flagged.append(f"{label} (no printed reference range)")
        elif decision["triage"] == "review_needed":
            flagged.append(f"{label} (printed range {row.get('reference_range')})")
    attention = "; ".join(flagged) if flagged else "none"
    return (
        f"This report lists {len(rows)} laboratory results. "
        f"Results outside the printed range or missing a range: {attention}. "
        "This is not a diagnosis."
    )


def _blocked(text: str) -> bool:
    return bool(BLOCKED.search(DISCLAIMER.sub("", text or "")))
