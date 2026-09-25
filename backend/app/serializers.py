from app.db import one, rows, rows_in


def latest_review(finding_id: str) -> dict | None:
    found = rows("doctor_reviews", {"finding_id": finding_id}, "decided_at")
    return found[-1] if found else None


def approved_row(finding_id: str) -> dict | None:
    return one("approved_findings", {"finding_id": finding_id})


def hydrate(raw_rows: list[dict]) -> list[dict]:
    if not raw_rows:
        return []
    ids = [row["id"] for row in raw_rows]
    latest: dict[str, dict] = {}
    for review in rows_in("doctor_reviews", "finding_id", ids):
        current = latest.get(review["finding_id"])
        if current is None or str(review.get("decided_at") or "") >= str(current.get("decided_at") or ""):
            latest[review["finding_id"]] = review
    approved = {row["finding_id"]: row for row in rows_in("approved_findings", "finding_id", ids)}
    doctor_ids = [review["doctor_id"] for review in latest.values() if review.get("doctor_id")]
    doctors = {row["id"]: row for row in rows_in("doctors", "id", doctor_ids)}
    return [
        to_finding(
            row,
            review=latest.get(row["id"]),
            approved=approved.get(row["id"]),
            reviewer=doctors.get((latest.get(row["id"]) or {}).get("doctor_id")),
            loaded=True,
        )
        for row in raw_rows
    ]


def to_finding(
    row: dict,
    review: dict | None = None,
    approved: dict | None = None,
    reviewer: dict | None = None,
    loaded: bool = False,
) -> dict:
    if not loaded:
        review = latest_review(row["id"])
        approved = approved_row(row["id"])
        reviewer = one("doctors", {"id": review["doctor_id"]}) if review and review.get("doctor_id") else None
    decision = review["doctor_decision"] if review else "pending"
    visible = bool(approved and approved.get("patient_visible"))
    return {
        "id": row["id"],
        "report_id": row["report_id"],
        "test_name": row["test_name"],
        "value": _value(row["value"]),
        "unit": row.get("unit") or "",
        "reference_range": row.get("reference_range") or "",
        "source": {
            "page": row.get("source_page") or 0,
            "line_start": row.get("source_line") or 0,
            "line_end": row.get("source_line") or 0,
            "excerpt": row.get("source_text") or "",
        },
        "jev": row.get("jev") or {},
        "overclaim_detail": row.get("overclaim_detail"),
        "teach": row.get("teach") or {"bullets": []},
        "checks": row.get("checks") or {},
        "previous_value": row.get("previous_value"),
        "previous_unit": row.get("previous_unit"),
        "ai_draft": row.get("ai_draft"),
        "gemini_rewrite": row.get("gemini_rewrite"),
        "doctor_decision": decision,
        "final_text": review.get("doctor_final_text") if review else None,
        "final_text_ta": review.get("doctor_final_text_ta") if review else None,
        "final_text_kn": review.get("doctor_final_text_kn") if review else None,
        "patient_visible": visible,
        "doctor_name": reviewer["name"] if reviewer else None,
        "decided_at": review.get("decided_at") if review else None,
        "reject_reason": review.get("reject_reason") if review else None,
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def to_public_finding(finding: dict) -> dict | None:
    if not finding["patient_visible"] or finding["doctor_decision"] in {"pending", "rejected"}:
        return None
    return {
        "id": finding["id"],
        "test_name": finding["test_name"],
        "value": finding["value"],
        "unit": finding["unit"],
        "reference_range": finding["reference_range"],
        "text": finding["final_text"],
        "source_page": finding["source"]["page"],
        "source_line": finding["source"]["line_start"],
        "source_text": finding["source"]["excerpt"],
        "doctor_name": finding["doctor_name"],
        "decided_at": finding["decided_at"],
    }


def _value(raw: str):
    try:
        number = float(raw)
        return int(number) if number.is_integer() else number
    except (TypeError, ValueError):
        return raw
