"""Gemini may propose rows. A row is kept only when its value is already in the document."""

import json
import re

from pydantic import BaseModel, Field, ValidationError

from app.gemini_client import configured, generate
from app.services.evidence import value_in_source
from app.services.terminology import display_name


class Candidate(BaseModel):
    test_name: str
    value: float | None = None
    unit: str | None = None
    reference_low: float | None = None
    reference_high: float | None = None
    source_page: int | None = None
    source_line: int | None = None


class CandidateBatch(BaseModel):
    findings: list[Candidate] = Field(default_factory=list)


def verify_candidate(document: str, candidate: Candidate) -> dict | None:
    if candidate.value is None or not candidate.test_name.strip():
        return None
    rendered = _render_value(candidate.value)
    if not value_in_source(rendered, document) and not value_in_source(str(candidate.value), document):
        return None
    line = _line_containing(document, rendered) or _line_containing(document, str(candidate.value))
    if line is None:
        return None
    page, number, text = line
    shown, _canonical = display_name(candidate.test_name)
    if shown.lower() not in text.lower() and candidate.test_name.lower() not in text.lower():
        return None
    low = candidate.reference_low
    high = candidate.reference_high
    reference = f"{low} - {high} {candidate.unit or ''}".strip() if low is not None and high is not None else ""
    if reference and not value_in_source(str(low), text):
        reference = ""
    return {
        "test_name": shown,
        "value": rendered,
        "unit": candidate.unit or "",
        "reference_range": reference,
        "source_page": page,
        "source_line": number,
        "source_text": text,
        "previous_value": None,
        "previous_unit": candidate.unit,
    }


def merge_verified(document: str, parsed: list[dict]) -> list[dict]:
    proposals = propose(document)
    if not proposals:
        return parsed
    seen = {row["test_name"].lower() for row in parsed}
    merged = list(parsed)
    for candidate in proposals:
        row = verify_candidate(document, candidate)
        if row is None or row["test_name"].lower() in seen:
            continue
        seen.add(row["test_name"].lower())
        merged.append(row)
    return merged


def propose(document: str) -> list[Candidate]:
    if not configured() or not document.strip():
        return []
    prompt = (
        "Return JSON only with the shape {\"findings\": [...]} . "
        "Each finding has test_name, value, unit, reference_low, reference_high, source_page, source_line. "
        "Use null when a field is not printed. Never invent a number, a range, or a page. "
        "Never diagnose. Never prescribe. Copy values exactly from the document.\n\n"
        f"{document[:12000]}"
    )
    try:
        raw = generate(prompt)
    except Exception:
        return []
    return _parse_model_json(raw)


def _parse_model_json(raw: str | None) -> list[Candidate]:
    if not raw:
        return []
    match = re.search(r"\{.*\}", raw, re.S)
    if not match:
        return []
    try:
        payload = json.loads(match.group(0))
        return CandidateBatch.model_validate(payload).findings
    except (json.JSONDecodeError, ValidationError):
        return []


def _render_value(value: float) -> str:
    if float(value).is_integer():
        return str(int(value))
    return str(value)


def _line_containing(document: str, needle: str) -> tuple[int, int, str] | None:
    page = 1
    number = 0
    compact = needle.replace(" ", "")
    for raw in document.splitlines():
        stripped = raw.strip()
        if stripped.startswith("[[PAGE ") and stripped.endswith("]]"):
            page = int(stripped[7:-2])
            number = 0
            continue
        number += 1
        if compact and compact in stripped.replace(" ", ""):
            return page, number, stripped
    return None
