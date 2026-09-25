"""Care records stored in audit_events so booking works on the current database."""

import json

from app.access import now
from app.db import insert, rows, update

ACTION = "CARE_RECORD"


def list_records(kind: str) -> list[dict]:
    found = []
    for event in rows("audit_events"):
        if event.get("action") != ACTION or event.get("actor_kind") != kind:
            continue
        try:
            data = json.loads(event.get("detail") or "{}")
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict):
            found.append(data)
    return found


def save_record(kind: str, record: dict) -> dict:
    insert(
        "audit_events",
        {
            "id": record["id"],
            "report_id": record.get("patient_id"),
            "finding_id": record["id"],
            "actor": "MediAssist",
            "actor_kind": kind,
            "action": ACTION,
            "detail": json.dumps(record),
            "created_at": record.get("created_at") or now(),
        },
    )
    return record


def replace_record(kind: str, record: dict) -> dict:
    update("audit_events", {"id": record["id"], "action": ACTION}, {"detail": json.dumps(record), "actor_kind": kind})
    return record
