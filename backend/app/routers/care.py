"""Longitudinal care routes. Patient responses contain approved records only."""

from datetime import date, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.access import now, require_patient_access, require_treating
from app.care_store import list_records, replace_record, save_record
from app.db import insert, one, rows, update
from app.jev import evaluate
from app.routers.api import _latest_event, audit
from app.security import current_user, require_doctor, require_patient
from app.services.evidence import reference_bounds, value_in_source
from app.services.terminology import display_name

router = APIRouter()

CANONICAL_TESTS = {
    "hemoglobin": "Hemoglobin",
    "wbc": "WBC",
    "platelets": "Platelets",
    "glucose": "Glucose",
    "mcv": "MCV",
}


class JevBody(BaseModel):
    test_name: str
    value: float | None = None
    unit: str = ""
    reference_low: float | None = None
    reference_high: float | None = None
    source_page: int | None = None
    source_line: int | None = None
    source_text: str = ""
    ai_draft: str = ""


class AppointmentBody(BaseModel):
    doctorId: str
    specialty: str = "General Medicine"
    appointmentDate: str
    appointmentTime: str
    reason: str = "Follow-up consultation"


class AppointmentPatch(BaseModel):
    status: str


class MedicationBody(BaseModel):
    patientId: str
    name: str
    dosage: str = ""
    frequency: str = ""
    route: str = "oral"
    instructions: str = "Doctor-approved demo instruction."


class ReminderBody(BaseModel):
    reminderTime: str
    frequency: str = "daily"


class RecommendationBody(BaseModel):
    reason: str
    recommendedSpecialty: str = "General Medicine"


class LanguageBody(BaseModel):
    language: str


class ChatBody(BaseModel):
    question: str
    reportId: str | None = None


@router.post("/jev/evaluate")
def jev_evaluate(body: JevBody, user: dict = Depends(current_user)):
    require_doctor(user)
    reference = ""
    if body.reference_low is not None and body.reference_high is not None:
        reference = f"{body.reference_low} - {body.reference_high} {body.unit}".strip()
    shown, canonical = display_name(body.test_name)
    row = {
        "test_name": shown,
        "value": "" if body.value is None else str(body.value),
        "unit": body.unit,
        "reference_range": reference,
        "source_page": body.source_page,
        "source_line": body.source_line,
        "source_text": body.source_text,
    }
    decision = evaluate(row, body.ai_draft)
    if body.value is not None and body.source_text and not value_in_source(str(body.value), body.source_text):
        decision["triage"] = "insufficient"
        decision["evidence"] = "insufficient"
        decision["reason_codes"] = list(dict.fromkeys([*decision["reason_codes"], "EXTRACTION_MISMATCH"]))
    if canonical is None:
        decision["reason_codes"] = list(dict.fromkeys([*decision["reason_codes"], "UNKNOWN_FIELD"]))
        decision["triage"] = "insufficient"
        decision["evidence"] = "insufficient"
    audit(user, "jev", "JEV_EVALUATED", shown)
    return {
        "test_name": shown,
        "canonical_name": canonical,
        "triage": decision["triage"],
        "evidence": decision["evidence"],
        "overclaim": decision["overclaim"],
        "reason_codes": decision["reason_codes"],
    }


@router.get("/findings/{finding_id}/evidence")
def finding_evidence(finding_id: str, user: dict = Depends(current_user)):
    row = one("ai_findings", {"id": finding_id})
    if not row:
        raise HTTPException(status_code=404, detail="Finding not found")
    report = one("reports", {"id": row["report_id"]})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    require_patient_access(user, report["patient_id"])
    if user["role"] == "patient":
        approved = one("approved_findings", {"finding_id": finding_id})
        if not approved or not approved.get("patient_visible"):
            raise HTTPException(status_code=404, detail="Finding not found")
    shown, canonical = display_name(row["test_name"])
    bounds = reference_bounds(row.get("reference_range") or "")
    verified = value_in_source(str(row.get("value") or ""), row.get("source_text") or "")
    audit(user, user["role"], "EVIDENCE_VIEWED", shown, report["id"], finding_id)
    return {
        "finding_id": finding_id,
        "test_name": shown,
        "canonical_name": canonical,
        "value": row.get("value"),
        "unit": row.get("unit") or "",
        "reference_range": bounds,
        "verified_in_source": verified,
        "source": {
            "report_id": report["id"],
            "file_name": report.get("file_name"),
            "page": row.get("source_page"),
            "line": row.get("source_line"),
            "text": row.get("source_text"),
        },
    }


@router.get("/patients/{patient_id}/visits")
def patient_visits(patient_id: str, user: dict = Depends(current_user)):
    require_patient_access(user, patient_id)
    return rows("visits", {"patient_id": patient_id})


@router.get("/patients/{patient_id}/allergies")
def patient_allergies(patient_id: str, user: dict = Depends(current_user)):
    require_patient_access(user, patient_id)
    found = rows("allergies", {"patient_id": patient_id})
    if user["role"] != "doctor":
        found = [item for item in found if item.get("patient_visible")]
    return found


@router.get("/patients/{patient_id}/trends/{canonical}")
def canonical_trend(patient_id: str, canonical: str, user: dict = Depends(current_user)):
    require_patient_access(user, patient_id)
    test_name = CANONICAL_TESTS.get(canonical.lower())
    if not test_name:
        raise HTTPException(status_code=404, detail="This trend is not in the supported set.")
    points = [
        item for item in rows("observations", {"patient_id": patient_id, "test_name": test_name}) if item.get("observed_on")
    ]
    points.sort(key=lambda item: item["observed_on"])
    values = [{"date": item["observed_on"], "value": float(item["value"])} for item in points]
    delta = round(values[-1]["value"] - values[-2]["value"], 4) if len(values) >= 2 else None
    overall = round(values[-1]["value"] - values[0]["value"], 4) if len(values) >= 2 else None
    return {
        "canonical_name": canonical.lower(),
        "values": values,
        "delta_from_previous": delta,
        "overall_change": overall,
    }


@router.get("/patients/{patient_id}/timeline")
def patient_timeline(patient_id: str, user: dict = Depends(current_user)):
    require_patient_access(user, patient_id)
    visits = rows("visits", {"patient_id": patient_id})
    observations = rows("observations", {"patient_id": patient_id})
    return {"visits": visits, "observations": observations}


@router.get("/patients/{patient_id}/knowledge-graph")
def knowledge_graph(patient_id: str, user: dict = Depends(current_user)):
    require_patient_access(user, patient_id)
    patient = one("patients", {"id": patient_id})
    nodes = [{"id": patient_id, "node_type": "PATIENT", "label": (patient or {}).get("name") or "Patient"}]
    edges = []
    for visit in rows("visits", {"patient_id": patient_id}):
        nodes.append({"id": visit["id"], "node_type": "VISIT", "label": visit.get("label") or visit.get("visit_date")})
        edges.append({"source": patient_id, "target": visit["id"], "relationship": "HAS_VISIT"})
    for report in rows("reports", {"patient_id": patient_id}):
        nodes.append({"id": report["id"], "node_type": "REPORT", "label": report.get("title")})
        edges.append({"source": patient_id, "target": report["id"], "relationship": "HAS_REPORT"})
    for allergy in rows("allergies", {"patient_id": patient_id}):
        if user["role"] != "doctor" and not allergy.get("patient_visible"):
            continue
        nodes.append({"id": allergy["id"], "node_type": "ALLERGY", "label": allergy.get("substance")})
        edges.append({"source": patient_id, "target": allergy["id"], "relationship": "HAS_ALLERGY"})
    return {"patient_id": patient_id, "nodes": nodes, "edges": edges}


@router.post("/reports/{report_id}/summary/approve")
def approve_summary(report_id: str, user: dict = Depends(current_user)):
    require_doctor(user)
    report = one("reports", {"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    require_treating(user, report["patient_id"])
    draft = _latest_event([report_id], "REPORT_SUMMARY").get(report_id)
    if not draft:
        raise HTTPException(status_code=404, detail="No summary is waiting for review.")
    audit(user, "doctor", "SUMMARY_APPROVED", draft["detail"], report_id)
    return {"report_id": report_id, "patient_visible": True}


@router.get("/appointments/slots")
def slots(doctorId: str, user: dict = Depends(current_user)):
    doctor = one("doctors", {"id": doctorId})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    start = date.today() + timedelta(days=1)
    offered = []
    for offset in range(3):
        day = start + timedelta(days=offset)
        for clock in ("10:30", "14:00"):
            offered.append({"doctorId": doctorId, "date": day.isoformat(), "time": clock, "specialty": doctor.get("specialty")})
    return offered


def _named(record: dict) -> dict:
    patient = one("patients", {"id": record.get("patient_id")}) if record.get("patient_id") else None
    doctor = one("doctors", {"id": record.get("doctor_id")}) if record.get("doctor_id") else None
    return {**record, "patient_name": (patient or {}).get("name"), "doctor_name": (doctor or {}).get("name")}


def _appointment_or_403(appointment_id: str, user: dict) -> dict:
    record = next((item for item in list_records("appointment") if item["id"] == appointment_id), None)
    if not record:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if user["role"] == "patient" and record["patient_id"] != user["profile_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user["role"] == "doctor" and record["doctor_id"] != user["profile_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return record


@router.get("/appointments/{appointment_id}")
def get_appointment(appointment_id: str, user: dict = Depends(current_user)):
    return _named(_appointment_or_403(appointment_id, user))


@router.get("/patient/doctors")
def my_doctors(user: dict = Depends(current_user)):
    require_patient(user)
    shares = rows("record_shares", {"patient_id": user["profile_id"]})
    doctor_ids = {item["shared_with_doctor_id"] for item in shares}
    reports = rows("reports", {"patient_id": user["profile_id"]})
    doctor_ids.update(item["doctor_id"] for item in reports)
    return [one("doctors", {"id": doctor_id}) for doctor_id in doctor_ids if one("doctors", {"id": doctor_id})]


@router.get("/patient/reports/{report_id}")
def patient_report(report_id: str, user: dict = Depends(current_user)):
    require_patient(user)
    report = one("reports", {"id": report_id, "patient_id": user["profile_id"]})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    from app.routers.api import approved

    return {
        "report_id": report["id"],
        "date": report.get("uploaded_at"),
        "approved_explanation": approved(report_id, user),
    }


@router.get("/appointments")
def list_appointments(user: dict = Depends(current_user)):
    records = list_records("appointment")
    if user["role"] == "patient":
        records = [item for item in records if item.get("patient_id") == user["profile_id"]]
    else:
        require_doctor(user)
        records = [item for item in records if item.get("doctor_id") == user["profile_id"]]
    return [_named(item) for item in records]


@router.post("/appointments")
def create_appointment(body: AppointmentBody, user: dict = Depends(current_user)):
    require_patient(user)
    if not one("doctors", {"id": body.doctorId}):
        raise HTTPException(status_code=404, detail="Doctor not found")
    record = {
        "id": f"appt-{uuid4().hex[:8]}",
        "patient_id": user["profile_id"],
        "doctor_id": body.doctorId,
        "specialty": body.specialty,
        "appointment_date": body.appointmentDate,
        "appointment_time": body.appointmentTime,
        "reason": body.reason,
        "status": "REQUESTED",
        "created_at": now(),
        "updated_at": now(),
    }
    save_record("appointment", record)
    audit(user, "patient", "APPOINTMENT_CREATED", body.reason)
    return _named(record)


@router.patch("/appointments/{appointment_id}")
def patch_appointment(appointment_id: str, body: AppointmentPatch, user: dict = Depends(current_user)):
    require_doctor(user)
    record = _appointment_or_403(appointment_id, user)
    if body.status not in {"CONFIRMED", "CANCELLED", "COMPLETED", "REQUESTED"}:
        raise HTTPException(status_code=400, detail="Status is not valid.")
    record["status"] = body.status
    record["updated_at"] = now()
    replace_record("appointment", record)
    action = {"CONFIRMED": "APPOINTMENT_CONFIRMED", "CANCELLED": "APPOINTMENT_CANCELLED"}.get(body.status, "APPOINTMENT_CREATED")
    audit(user, "doctor", action, record.get("reason") or body.status)
    return _named(record)


@router.post("/appointments/{appointment_id}/cancel")
def cancel_appointment(appointment_id: str, user: dict = Depends(current_user)):
    record = _appointment_or_403(appointment_id, user)
    record["status"] = "CANCELLED"
    record["updated_at"] = now()
    replace_record("appointment", record)
    audit(user, user["role"], "APPOINTMENT_CANCELLED", record.get("reason") or "Cancelled")
    return {"status": "CANCELLED"}


@router.get("/patients/me/medications")
@router.get("/patients/{patient_id}/medications")
def list_medications(patient_id: str | None = None, user: dict = Depends(current_user)):
    target = patient_id or user["profile_id"]
    if user["role"] == "patient" and target != user["profile_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user["role"] == "doctor":
        require_patient_access(user, target)
    found = [item for item in list_records("medication") if item.get("patient_id") == target]
    if user["role"] != "doctor":
        found = [item for item in found if item.get("approved_by_doctor")]
    return found


@router.post("/medications")
def create_medication(body: MedicationBody, user: dict = Depends(current_user)):
    require_doctor(user)
    require_treating(user, body.patientId)
    record = {
        "id": f"med-{uuid4().hex[:8]}",
        "patient_id": body.patientId,
        "doctor_id": user["profile_id"],
        "name": body.name,
        "dosage": body.dosage,
        "frequency": body.frequency,
        "route": body.route,
        "instructions": body.instructions,
        "status": "active",
        "approved_by_doctor": True,
        "created_at": now(),
    }
    save_record("medication", record)
    audit(user, "doctor", "MEDICATION_CREATED", body.name)
    return record


@router.post("/medications/{medication_id}/reminders")
def create_reminder(medication_id: str, body: ReminderBody, user: dict = Depends(current_user)):
    require_doctor(user)
    medication = next((item for item in list_records("medication") if item["id"] == medication_id), None)
    if not medication or not medication.get("approved_by_doctor"):
        raise HTTPException(status_code=404, detail="Approved medication not found")
    require_treating(user, medication["patient_id"])
    record = {
        "id": f"rem-{uuid4().hex[:8]}",
        "medication_id": medication_id,
        "patient_id": medication["patient_id"],
        "reminder_time": body.reminderTime,
        "frequency": body.frequency,
        "status": "scheduled",
    }
    save_record("reminder", record)
    audit(user, "doctor", "REMINDER_CREATED", f"{medication['name']} at {body.reminderTime}")
    return record


@router.get("/patients/me/reminders")
def my_reminders(user: dict = Depends(current_user)):
    require_patient(user)
    return _reminders_for(user["profile_id"])


@router.get("/patients/{patient_id}/reminders")
def doctor_reminders(patient_id: str, user: dict = Depends(current_user)):
    require_doctor(user)
    require_patient_access(user, patient_id)
    return _reminders_for(patient_id)


def _reminders_for(patient_id: str) -> list[dict]:
    meds = {item["id"]: item for item in list_records("medication") if item.get("patient_id") == patient_id and item.get("approved_by_doctor")}
    visible = []
    for item in list_records("reminder"):
        if item.get("patient_id") != patient_id:
            continue
        medication = meds.get(item.get("medication_id"))
        if not medication:
            continue
        visible.append({**item, "name": medication["name"], "dosage": medication.get("dosage"), "instructions": medication.get("instructions")})
    return visible


@router.post("/reminders/{reminder_id}/taken")
def mark_taken(reminder_id: str, user: dict = Depends(current_user)):
    require_patient(user)
    reminder = next((item for item in list_records("reminder") if item["id"] == reminder_id and item.get("patient_id") == user["profile_id"]), None)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder["status"] = "taken"
    reminder["last_triggered_at"] = now()
    replace_record("reminder", reminder)
    audit(user, "patient", "REMINDER_COMPLETED", reminder.get("reminder_time") or "taken")
    return {"status": "taken"}


@router.get("/patients/me/recommendations")
@router.get("/patients/{patient_id}/recommendations")
def list_recommendations(patient_id: str | None = None, user: dict = Depends(current_user)):
    target = patient_id or user["profile_id"]
    if user["role"] == "patient" and target != user["profile_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user["role"] == "doctor":
        require_patient_access(user, target)
    found = [item for item in list_records("followup") if item.get("patient_id") == target]
    if user["role"] != "doctor":
        found = [item for item in found if item.get("patient_visible") and item.get("status") == "approved"]
        return [
            {
                "id": item["id"],
                "text": item["reason"],
                "recommended_specialty": item.get("recommended_specialty"),
                "status": "approved",
            }
            for item in found
        ]
    return found


@router.post("/patients/{patient_id}/recommendations")
def create_recommendation(patient_id: str, body: RecommendationBody, user: dict = Depends(current_user)):
    require_doctor(user)
    require_treating(user, patient_id)
    record = {
        "id": f"rec-{uuid4().hex[:8]}",
        "patient_id": patient_id,
        "doctor_id": user["profile_id"],
        "reason": body.reason,
        "recommended_specialty": body.recommendedSpecialty,
        "status": "approved",
        "patient_visible": True,
        "created_at": now(),
    }
    save_record("followup", record)
    audit(user, "doctor", "FOLLOWUP_RECOMMENDED", body.reason)
    return record


@router.get("/patients/me/language")
def get_language(user: dict = Depends(current_user)):
    require_patient(user)
    patient = one("patients", {"id": user["profile_id"]}) or {}
    return {"language": patient.get("preferred_language") or "en"}


@router.patch("/patients/me/language")
def set_language(body: LanguageBody, user: dict = Depends(current_user)):
    require_patient(user)
    allowed = {"en", "ta", "kn", "hi", "te", "ml"}
    if body.language not in allowed:
        raise HTTPException(status_code=400, detail="Language must be en, ta, kn, hi, te, or ml.")
    try:
        update("patients", {"id": user["profile_id"]}, {"preferred_language": body.language})
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Run backend/sql/migration_care.sql to store the language preference.") from exc
    return {"language": body.language}


@router.post("/chat")
def chat_alias(body: ChatBody, user: dict = Depends(current_user)):
    from app.routers.api import AskBody, ask

    return ask(AskBody(question=body.question, reportId=body.reportId), user)


@router.get("/handoffs/{handoff_id}")
def get_handoff(handoff_id: str, user: dict = Depends(current_user)):
    require_doctor(user)
    handoff = one("clinical_handoffs", {"id": handoff_id})
    if not handoff or user["profile_id"] not in {handoff["created_by"], handoff["assigned_to"]}:
        raise HTTPException(status_code=403, detail="Forbidden")
    return handoff


@router.post("/sharing/{share_id}/revoke")
def revoke_by_id(share_id: str, user: dict = Depends(current_user)):
    require_patient(user)
    share = one("record_shares", {"id": share_id, "patient_id": user["profile_id"]})
    if not share:
        raise HTTPException(status_code=403, detail="Forbidden")
    update("record_shares", {"id": share["id"]}, {"status": "REVOKED", "revoked_at": now()})
    audit(user, "patient", "SHARE_REVOKED", f"Revoked {share['access_token']}.")
    return {"status": "REVOKED"}


def _table_ready(table: str) -> None:
    try:
        rows(table)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Run backend/sql/migration_care.sql before using {table}.") from exc
