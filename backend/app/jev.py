"""Jev is a typed referee. It does not write patient-facing prose."""

import re

BLOCKED = re.compile(r"leukemia|cancer|anemia|diagnos|\byou have\b", re.I)
DISCLAIMER = re.compile(r"\bnot a diagnosis\b\.?", re.I)


def evaluate(row: dict, draft: str | None) -> dict:
    value = _number(row.get("value"))
    low, high = _range(row.get("reference_range") or "")
    has_source = bool(row.get("source_text")) and row.get("source_page") and row.get("source_line")
    has_reference = low is not None and high is not None
    has_value = value is not None
    outside = bool(has_reference and has_value and (value < low or value > high))
    previous = _number(row.get("previous_value"))
    reasons: list[str] = []
    if not has_source:
        reasons.append("MISSING_SOURCE")
    if not has_value:
        reasons.append("MISSING_VALUE")
    if not has_reference:
        reasons.append("MISSING_REFERENCE_RANGE")
    if outside:
        reasons.append("OUTSIDE_REFERENCE_RANGE")
    if previous is not None and has_value and previous != value:
        reasons.append("TREND_CHANGE")
    overclaim = bool(draft and BLOCKED.search(DISCLAIMER.sub("", draft)))
    if overclaim:
        reasons.append("POSSIBLE_OVERCLAIM")

    if not has_source or not has_reference or not has_value:
        triage = "insufficient"
        evidence = "insufficient"
    elif outside or overclaim:
        triage = "review_needed"
        evidence = "strong" if has_source and has_reference and outside else "limited" if overclaim else "moderate"
    else:
        triage = "routine_normal"
        evidence = "strong"
        reasons.append("ROUTINE_NORMAL")

    return {
        "triage": triage,
        "evidence": evidence,
        "overclaim": overclaim,
        "reason_codes": reasons,
        "checks": {
            "source_found": bool(has_source),
            "value_extracted": bool(has_value),
            "reference_available": bool(has_reference),
            "outside_range": outside,
            "previous_available": previous is not None,
        },
    }


def assert_publishable(text: str, finding: dict) -> None:
    cleaned = (text or "").strip()
    jev = finding.get("jev") or {}
    checks = finding.get("checks") or {}
    if not cleaned:
        raise ValueError("Approved wording cannot be empty.")
    if not checks.get("source_found") or not finding.get("source", {}).get("excerpt"):
        raise ValueError("Approval is disabled because this finding has no pinned source.")
    if not checks.get("reference_available") or not str(finding.get("reference_range") or "").strip():
        raise ValueError("Approval is disabled because the reference range is missing.")
    if jev.get("evidence") == "insufficient" or jev.get("triage") == "insufficient":
        raise ValueError("Approval is disabled because Jev marked the evidence insufficient.")
    draft = (finding.get("ai_draft") or "").strip()
    if jev.get("overclaim") and cleaned == draft:
        raise ValueError("Policy blocked publication of an overclaim draft. Edit the wording or reject the card.")
    if BLOCKED.search(DISCLAIMER.sub("", cleaned)):
        raise ValueError("Policy blocked diagnostic wording. Remove it before publishing.")


HEMOGLOBIN_OVERCLAIM = "These results indicate that the patient has iron-deficiency anemia."


def demo_draft(row: dict) -> str:
    """Offline draft used when Gemini is not configured. Hemoglobin keeps the teach-mode overclaim."""
    if row.get("test_name") == "Hemoglobin" and (row.get("reference_range") or "").strip():
        return HEMOGLOBIN_OVERCLAIM
    return fallback_draft(row)


def fallback_draft(row: dict) -> str:
    value = _number(row.get("value"))
    low, high = _range(row.get("reference_range") or "")
    name = row.get("test_name") or "This value"
    if low is None or value is None:
        return f"{name} was extracted, but the printed reference range is missing."
    if value < low or value > high:
        return f"{name} is outside the reference range printed on this report."
    return f"{name} is within the reference range printed on this report."


def safe_rewrite(row: dict) -> str:
    value = _number(row.get("value"))
    low, high = _range(row.get("reference_range") or "")
    name = str(row.get("test_name") or "result").lower()
    if low is None or value is None:
        return f"The {name} value was read from the report, and no reference range was printed."
    if value < low:
        return f"Your {name} level is below the reference range provided in the report."
    if value > high:
        return f"Your {name} level is above the reference range provided in the report."
    return f"Your {name} level is within the reference range provided in the report."


def _number(value) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", ""))
    except ValueError:
        return None


def _range(text: str) -> tuple[float | None, float | None]:
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)", text.replace(",", ""))
    if not match:
        return None, None
    return float(match.group(1)), float(match.group(2))
