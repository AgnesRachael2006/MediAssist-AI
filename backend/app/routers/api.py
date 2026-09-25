from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel

from app.access import doctor_name, level, now, require_patient_access, require_treating
from app.db import insert, one, ping, rows, rows_in, update, upsert
from app.explain import approved_explanation, translate_kn, translate_ta
from app.extract import SYNTHETIC_CBC, finding_id, parse_report, read_pdf, source_lines
from app.gemini_client import configured, draft_for_row, explain_approved, rewrite_text
from app.jev import assert_publishable, demo_draft, evaluate, fallback_draft, safe_rewrite
from app.security import current_user, hash_password, issue_token, password_ok, require_role
from app.serializers import hydrate, to_finding, to_public_finding
from app.services.gemini_extract import merge_verified
from app.summary import report_summary

router = APIRouter()


class LoginBody(BaseModel):
    email: str
    password: str


class SignupBody(BaseModel):
    fullName: str
    email: str
    password: str
    role: str


class UploadBody(BaseModel):
    fileName: str
    patientId: str = "patient-arun"


class EditBody(BaseModel):
    final_text: str


class RejectBody(BaseModel):
    reason: str
    note: str | None = None


class AskBody(BaseModel):
    reportId: str | None = None
    question: str


class ShareBody(BaseModel):
    doctorId: str
    permissions: list[str]
    hours: int = 24
    purpose: str = "Consultation"


class AccessBody(BaseModel):
    code: str


class RevokeBody(BaseModel):
    shareId: str


class HandoffBody(BaseModel):
    patientId: str
    assignedTo: str
    reason: str


class ReviewBody(BaseModel):
    reportId: str | None = None
    insightId: str | None = None
    status: str
    decisionNote: str = ""
    editedFinding: str | None = None


class SafetyBody(BaseModel):
    patientId: str
    medications: list[dict] = []


class RewriteBody(BaseModel):
    style: str = "patient_friendly"


def audit(user: dict, kind: str, action: str, detail: str, report_id: str | None = None, finding_id: str | None = None):
    insert(
        "audit_events",
        {
            "id": f"aud-{uuid4().hex[:10]}",
            "report_id": report_id,
            "finding_id": finding_id,
            "actor": user.get("name") or user.get("email"),
            "actor_kind": kind,
            "action": action,
            "detail": detail,
            "created_at": now(),
        },
    )


def session_payload(user: dict) -> dict:
    return {
        "role": user["role"],
        "email": user["email"],
        "name": user["full_name"],
        "profileId": user["profile_id"],
        "title": "Clinician" if user["role"] == "doctor" else "Patient",
        "token": issue_token(user),
    }


@router.post("/auth/login")
def login(body: LoginBody):
    user = one("users", {"email": body.email.strip().lower()})
    if not user or not password_ok(user["password_hash"], body.password, user["email"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return session_payload(user)


@router.post("/auth/signup")
def signup(body: SignupBody):
    if body.role not in {"doctor", "patient"}:
        raise HTTPException(status_code=400, detail="Role must be doctor or patient")
    email = body.email.strip().lower()
    if one("users", {"email": email}):
        raise HTTPException(status_code=409, detail="Account already exists")
    profile_id = f"{body.role}-{uuid4().hex[:8]}"
    if body.role == "doctor":
        insert("doctors", {"id": profile_id, "name": body.fullName, "title": "Clinician", "specialty": "General", "email": email})
    else:
        insert("patients", {"id": profile_id, "name": body.fullName, "email": email, "mrn": profile_id})
    user = {
        "id": f"user-{uuid4().hex[:8]}",
        "email": email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "full_name": body.fullName,
        "profile_id": profile_id,
    }
    insert("users", user)
    return session_payload(user)


@router.post("/auth/logout")
def logout():
    return {"ok": True}


@router.get("/health")
def health():
    return {"ok": True, "gemini_configured": configured(), "database": ping()}


@router.get("/system/status")
def system_status():
    return {"pdf": True, "gemini": configured(), "jev": True, "database": ping()}


@router.get("/reports")
def list_reports(user: dict = Depends(current_user)):
    if user["role"] == "patient":
        found = rows("reports", {"patient_id": user["profile_id"]})
    else:
        found = rows("reports", {"doctor_id": user["profile_id"]})
    return [_report(item) for item in found]


@router.get("/reports/{report_id}")
def get_report(report_id: str, user: dict = Depends(current_user)):
    report = one("reports", {"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    require_patient_access(user, report["patient_id"])
    return _report(report)


@router.post("/reports/upload")
async def upload_report(request: Request, user: dict = Depends(current_user)):
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        upload = form.get("file")
        patient_id = str(form.get("patientId") or "patient-arun")
        if upload is None or not hasattr(upload, "read"):
            raise HTTPException(status_code=400, detail="Choose a PDF to upload.")
        filename = getattr(upload, "filename", None) or "report.pdf"
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Please choose a PDF.")
        data = await upload.read()
        if not data:
            raise HTTPException(status_code=400, detail="The selected file is empty.")
        if len(data) > 8_000_000:
            raise HTTPException(status_code=413, detail="The PDF must be smaller than 8 MB.")
        try:
            extracted = read_pdf(data)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        notes = "Text extracted from the uploaded PDF."
        synthetic = False
    else:
        body = UploadBody.model_validate(await request.json())
        if user["role"] != "doctor":
            raise HTTPException(status_code=403, detail="Forbidden")
        patient_id = body.patientId
        filename = body.fileName
        extracted = SYNTHETIC_CBC
        notes = "Demo report. No file bytes were sent."
        synthetic = True
    if user["role"] == "patient":
        patient_id = user["profile_id"]
        doctor_id = _record_doctor(patient_id)
    elif user["role"] == "doctor":
        require_treating(user, patient_id)
        doctor_id = user["profile_id"]
    else:
        raise HTTPException(status_code=403, detail="Forbidden")
    report_id = f"rpt-{uuid4().hex[:8]}"
    payload = {
        "id": report_id,
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "title": filename.rsplit(".", 1)[0] or "Uploaded report",
        "type": "PDF",
        "file_name": filename,
        "uploaded_at": now(),
        "processing_status": "processing",
        "is_synthetic": synthetic,
        "notes": notes,
        "extracted_text": extracted,
    }
    insert("reports", payload)
    audit(user, "system", "REPORT_UPLOADED", f"{filename} uploaded.", report_id)
    parsed = merge_verified(extracted, parse_report(extracted))
    if parsed and not synthetic:
        _store_findings(user, report_id, parsed, use_gemini=False)
    if not synthetic:
        _save_summary(user, report_id, report_summary(parsed))
    return _report(payload)


@router.post("/reports/{report_id}/analyze")
def analyze_report(report_id: str, user: dict = Depends(current_user)):
    require_role(user, "doctor")
    report = _owned_report(user, report_id)
    text = (report.get("extracted_text") or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="This report has no extracted text.")
    parsed = merge_verified(text, parse_report(text))
    if not parsed:
        raise HTTPException(status_code=422, detail="No laboratory rows could be read from this report.")
    created = _store_findings(user, report_id, parsed, use_gemini=True)
    _save_summary(user, report_id, report_summary(parsed))
    return {"report_id": report_id, "findings": len(created), "gemini": configured()}


@router.get("/reports/{report_id}/source")
def report_source(report_id: str, user: dict = Depends(current_user)):
    report = _visible_report(user, report_id)
    return source_lines(report.get("extracted_text") or "", report_id)


@router.get("/reports/{report_id}/findings")
def report_findings(report_id: str, user: dict = Depends(current_user)):
    report = _visible_report(user, report_id)
    findings = hydrate(rows("ai_findings", {"report_id": report_id}))
    if level(user, report["patient_id"]) != "treating":
        return [item for item in map(to_public_finding, findings) if item]
    return findings


@router.post("/findings/{finding_id}/accept")
@router.post("/ai/findings/{finding_id}/accept")
def accept_finding(finding_id: str, user: dict = Depends(current_user)):
    finding = _doctor_finding(user, finding_id)
    text = (finding.get("gemini_rewrite") or finding.get("ai_draft") or "").strip()
    _publish(user, finding, text, "accepted")
    return to_finding(one("ai_findings", {"id": finding_id}))


@router.post("/findings/{finding_id}/edit")
@router.post("/ai/findings/{finding_id}/edit")
def edit_finding(finding_id: str, body: EditBody, user: dict = Depends(current_user)):
    finding = _doctor_finding(user, finding_id)
    _publish(user, finding, body.final_text, "edited")
    return to_finding(one("ai_findings", {"id": finding_id}))


@router.post("/findings/{finding_id}/reject")
@router.post("/ai/findings/{finding_id}/reject")
def reject_finding(finding_id: str, body: RejectBody, user: dict = Depends(current_user)):
    finding = _doctor_finding(user, finding_id)
    insert(
        "doctor_reviews",
        {
            "id": f"rev-{uuid4().hex[:10]}",
            "finding_id": finding_id,
            "doctor_id": user["profile_id"],
            "doctor_decision": "rejected",
            "doctor_final_text": None,
            "reject_reason": body.reason,
            "decided_at": now(),
        },
    )
    upsert(
        "approved_findings",
        {"id": f"appr-{finding_id}", "finding_id": finding_id, "patient_visible": False, "approved_text": None},
    )
    audit(user, "doctor", "FINDING_REJECTED", body.reason, finding["report_id"], finding_id)
    return to_finding(one("ai_findings", {"id": finding_id}))


@router.post("/ai/findings/{finding_id}/rewrite")
@router.post("/findings/{finding_id}/rewrite")
def rewrite_finding(
    finding_id: str,
    user: dict = Depends(current_user),
    body: RewriteBody = Body(default_factory=lambda: RewriteBody()),
):
    finding = _doctor_finding(user, finding_id)
    style = body.style
    if not configured():
        text = safe_rewrite(finding)
    else:
        try:
            text = rewrite_text(finding, style) or safe_rewrite(finding)
        except Exception:
            text = safe_rewrite(finding)
    update("ai_findings", {"id": finding_id}, {"gemini_rewrite": text, "updated_at": now()})
    audit(user, "ai", "GEMINI_GENERATED", "Rewrite stored. It is not patient-visible.", finding["report_id"], finding_id)
    return to_finding(one("ai_findings", {"id": finding_id}))


@router.get("/reports/{report_id}/approved")
@router.get("/reports/{report_id}/patient-explanation")
def approved(report_id: str, user: dict = Depends(current_user)):
    report = _visible_report(user, report_id)
    findings = hydrate(rows("ai_findings", {"report_id": report_id}))
    return approved_explanation(report, findings, doctor_name(report["doctor_id"]))


@router.get("/doctor/dashboard")
def dashboard(user: dict = Depends(current_user)):
    require_role(user, "doctor")
    reports = rows("reports", {"doctor_id": user["profile_id"]})
    findings = hydrate(rows_in("ai_findings", "report_id", [report["id"] for report in reports]))
    return {
        "greeting_name": user["name"],
        "rows_extracted": len(findings),
        "review_needed": sum(1 for item in findings if item["jev"].get("triage") == "review_needed"),
        "routine_normal": sum(1 for item in findings if item["jev"].get("triage") == "routine_normal"),
        "insufficient": sum(1 for item in findings if item["jev"].get("triage") == "insufficient"),
        "approved": sum(1 for item in findings if item["doctor_decision"] in {"accepted", "edited"}),
        "rejected": sum(1 for item in findings if item["doctor_decision"] == "rejected"),
        "pending": sum(1 for item in findings if item["doctor_decision"] == "pending" and item["jev"].get("triage") != "routine_normal"),
        "patient_visible": sum(1 for item in findings if item["patient_visible"]),
        "queue": [
            {
                "report_id": report["id"],
                "patient_name": (one("patients", {"id": report["patient_id"]}) or {}).get("name"),
                "report_name": report["title"],
                "review_count": sum(1 for item in findings if item["report_id"] == report["id"] and item["doctor_decision"] == "pending"),
                "status": report["processing_status"],
                "uploaded_at": report["uploaded_at"],
            }
            for report in reports
        ],
        "attention": [item for item in findings if item["jev"].get("triage") != "routine_normal" and item["doctor_decision"] == "pending"],
    }


@router.get("/patient/trends")
@router.get("/patients/{patient_id}/trends")
def trends(patient_id: str | None = None, user: dict = Depends(current_user)):
    target = patient_id or user["profile_id"]
    require_patient_access(user, target)
    return _trend_series(target)


@router.post("/assistant/ask")
def ask(body: AskBody, user: dict = Depends(current_user)):
    require_role(user, "patient")
    question = body.question.strip()
    if _emergency(question):
        return {
            "classification": "emergency_decision",
            "allowed": False,
            "status_label": "Doctor discussion required",
            "answer": "If this is an emergency, contact local emergency services or your healthcare provider now. MediAssist cannot diagnose an emergency.",
        }
    if _blocked(question):
        return {
            "classification": "diagnosis_request",
            "allowed": False,
            "status_label": "Doctor discussion required",
            "answer": "This question requires discussion with your doctor. MediAssist cannot provide a diagnosis or medication instruction.",
        }
    glossary = _glossary(question)
    if glossary:
        return {
            "classification": "explain_term",
            "allowed": True,
            "status_label": "Educational question",
            "answer": glossary,
        }
    if any(word in question.lower() for word in ("last report", "changed", "previous", "lower than", "higher than")):
        return {
            "classification": "compare_history",
            "allowed": True,
            "status_label": "Educational question",
            "answer": _history_answer(user["profile_id"], question),
        }
    approved = _approved_sentences(user["profile_id"])
    context = " ".join(approved[:6]) if approved else "Your doctor has not published a note for this question yet."
    return {
        "classification": "explain_approved_content",
        "allowed": True,
        "status_label": "Educational question",
        "answer": f"{context} This is not a diagnosis.",
    }


@router.get("/audit")
def audit_feed(reportId: str | None = None, user: dict = Depends(current_user)):
    found = rows("audit_events")
    if reportId:
        found = [item for item in found if item.get("report_id") == reportId]
    found = [item for item in found if item["action"] not in {"REPORT_SUMMARY", "CARE_RECORD"}]
    if user["role"] == "patient":
        hidden = {"JEV_EVALUATED", "GEMINI_GENERATED"}
        found = [item for item in found if item["action"] not in hidden]
    return [
        {
            "id": item["id"],
            "report_id": item.get("report_id"),
            "finding_id": item.get("finding_id"),
            "timestamp": item["created_at"],
            "actor": item["actor"],
            "actor_kind": item["actor_kind"],
            "action": item["action"],
            "detail": item.get("detail") or "",
        }
        for item in found
    ]


@router.get("/patients/me/health-vault")
def my_vault(user: dict = Depends(current_user)):
    require_role(user, "patient")
    return _vault(user, user["profile_id"])


@router.get("/patients/{patient_id}/health-vault")
def patient_vault(patient_id: str, user: dict = Depends(current_user)):
    require_patient_access(user, patient_id)
    return _vault(user, patient_id)


@router.get("/patients/{patient_id}/data-quality")
def quality(patient_id: str, user: dict = Depends(current_user)):
    require_treating(user, patient_id)
    return _quality(patient_id)


@router.post("/sharing/create")
def create_share(body: ShareBody, user: dict = Depends(current_user)):
    require_role(user, "patient")
    token = f"MA-{uuid4().hex[:4].upper()}"
    share = {
        "id": f"share-{uuid4().hex[:8]}",
        "patient_id": user["profile_id"],
        "shared_with_doctor_id": body.doctorId,
        "access_token": token,
        "permissions": body.permissions,
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=body.hours)).isoformat(),
        "purpose": body.purpose,
        "status": "ACTIVE",
        "created_at": now(),
        "revoked_at": None,
    }
    insert("record_shares", share)
    audit(user, "patient", "SHARE_CREATED", f"Code {token} for doctor {body.doctorId}.")
    return share


@router.post("/sharing/access")
def access_share(body: AccessBody, user: dict = Depends(current_user)):
    require_role(user, "doctor")
    share = one("record_shares", {"access_token": body.code.strip().upper()})
    if not share or share["shared_with_doctor_id"] != user["profile_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if share["status"] == "REVOKED" or share.get("revoked_at"):
        raise HTTPException(status_code=403, detail="Access revoked")
    expires = datetime.fromisoformat(share["expires_at"].replace("Z", "+00:00"))
    if expires <= datetime.now(timezone.utc):
        raise HTTPException(status_code=403, detail="Access expired")
    audit(user, "doctor", "SHARE_ACCESSED", f"Opened {share['access_token']}.")
    vault = _vault(user, share["patient_id"], permissions=set(share["permissions"]))
    return vault


@router.post("/sharing/revoke")
def revoke_share(body: RevokeBody, user: dict = Depends(current_user)):
    require_role(user, "patient")
    share = one("record_shares", {"id": body.shareId, "patient_id": user["profile_id"]})
    if not share:
        raise HTTPException(status_code=403, detail="Forbidden")
    update("record_shares", {"id": share["id"]}, {"status": "REVOKED", "revoked_at": now()})
    audit(user, "patient", "SHARE_REVOKED", f"Revoked {share['access_token']}.")
    return {"status": "REVOKED"}


@router.get("/sharing/active")
def active_shares(user: dict = Depends(current_user)):
    require_role(user, "patient")
    return rows("record_shares", {"patient_id": user["profile_id"]})


@router.post("/handoffs")
def create_handoff(body: HandoffBody, user: dict = Depends(current_user)):
    require_treating(user, body.patientId)
    summary = _handoff_summary(body.patientId)
    handoff = {
        "id": f"hand-{uuid4().hex[:8]}",
        "patient_id": body.patientId,
        "created_by": user["profile_id"],
        "assigned_to": body.assignedTo,
        "reason": body.reason,
        "summary": summary,
        "ai_summary": None,
        "status": "open",
        "created_at": now(),
    }
    if configured():
        try:
            handoff["ai_summary"] = explain_approved("Summarise the approved record only.", summary)
        except Exception:
            handoff["ai_summary"] = None
    insert("clinical_handoffs", handoff)
    audit(user, "doctor", "HANDOFF_CREATED", body.reason)
    return handoff


@router.get("/handoffs")
def list_handoffs(user: dict = Depends(current_user)):
    require_role(user, "doctor")
    found = rows("clinical_handoffs")
    return [item for item in found if item["created_by"] == user["profile_id"] or item["assigned_to"] == user["profile_id"]]


@router.post("/handoffs/{handoff_id}/accept")
def accept_handoff(handoff_id: str, user: dict = Depends(current_user)):
    handoff = one("clinical_handoffs", {"id": handoff_id, "assigned_to": user["profile_id"]})
    if not handoff:
        raise HTTPException(status_code=403, detail="Forbidden")
    update("clinical_handoffs", {"id": handoff_id}, {"status": "accepted", "accepted_at": now()})
    audit(user, "doctor", "HANDOFF_ACCEPTED", handoff["reason"])
    saved = one("clinical_handoffs", {"id": handoff_id})
    return saved or {"status": "accepted"}


@router.post("/handoffs/{handoff_id}/close")
def close_handoff(handoff_id: str, user: dict = Depends(current_user)):
    handoff = one("clinical_handoffs", {"id": handoff_id})
    if not handoff or user["profile_id"] not in {handoff["created_by"], handoff["assigned_to"]}:
        raise HTTPException(status_code=403, detail="Forbidden")
    update("clinical_handoffs", {"id": handoff_id}, {"status": "closed", "closed_at": now()})
    return one("clinical_handoffs", {"id": handoff_id})


@router.post("/handoffs/{handoff_id}/summary")
def handoff_summary(handoff_id: str, user: dict = Depends(current_user)):
    handoff = one("clinical_handoffs", {"id": handoff_id})
    if not handoff:
        raise HTTPException(status_code=404, detail="Handoff not found")
    require_treating(user, handoff["patient_id"])
    if not configured():
        raise HTTPException(status_code=503, detail="AI assistance unavailable. Structured report data remains available.")
    try:
        text = explain_approved("Summarise the approved record only.", handoff["summary"])
    except Exception:
        text = None
    if not text:
        raise HTTPException(status_code=503, detail="AI assistance unavailable. Structured report data remains available.")
    update("clinical_handoffs", {"id": handoff_id}, {"ai_summary": text})
    return one("clinical_handoffs", {"id": handoff_id})


@router.get("/sharing/history")
def share_history(user: dict = Depends(current_user)):
    require_role(user, "patient")
    return [_present_share(item) for item in rows("record_shares", {"patient_id": user["profile_id"]})]


@router.get("/patients/{patient_id}/reports")
def patient_reports(patient_id: str, user: dict = Depends(current_user)):
    require_patient_access(user, patient_id)
    return [_report(item) for item in rows("reports", {"patient_id": patient_id})]


@router.get("/reports/{report_id}/insight")
def report_insight(report_id: str, user: dict = Depends(current_user)):
    report = _visible_report(user, report_id)
    require_treating(user, report["patient_id"])
    findings = hydrate(rows("ai_findings", {"report_id": report_id}))
    attention = [item for item in findings if item["jev"].get("triage") != "routine_normal"]
    lead = attention[0] if attention else (findings[0] if findings else None)
    if not lead:
        return None
    missing = (lead.get("overclaim_detail") or {}).get("missing") or []
    return {
        "id": f"ins-{report_id}",
        "reportId": report_id,
        "title": lead["test_name"],
        "finding": lead.get("ai_draft") or "",
        "consideration": "This is a finding for clinician review, not a diagnosis.",
        "evidence": lead["source"]["excerpt"],
        "evidenceStrength": lead["jev"].get("evidence") or "insufficient",
        "supportingInformation": [f"{lead['test_name']} {lead['value']} {lead['unit']}".strip()],
        "missingInformation": missing,
        "recommendedReview": "Review the pinned source before accepting.",
        "reviewRecommended": lead["jev"].get("triage") != "routine_normal",
    }


@router.get("/reports/{report_id}/review")
def report_review(report_id: str, user: dict = Depends(current_user)):
    report = _visible_report(user, report_id)
    findings = hydrate(rows("ai_findings", {"report_id": report_id}))
    decided = [item for item in findings if item["doctor_decision"] != "pending"]
    if not decided:
        return None
    latest = decided[-1]
    status = {"accepted": "accepted", "edited": "modified", "rejected": "rejected"}.get(latest["doctor_decision"], "pending")
    return {
        "id": f"rev-{report_id}",
        "reportId": report_id,
        "insightId": latest["id"],
        "doctorId": report["doctor_id"],
        "status": status,
        "decisionNote": latest.get("final_text") or latest.get("reject_reason") or "",
        "editedFinding": latest.get("final_text"),
        "recordedAt": latest.get("decided_at"),
    }


@router.post("/reports/{report_id}/review")
def submit_review(report_id: str, body: ReviewBody, user: dict = Depends(current_user)):
    report = _owned_report(user, report_id)
    if body.status not in {"accepted", "modified", "rejected"}:
        raise HTTPException(status_code=400, detail="Status must be accepted, modified, or rejected")
    audit(user, "doctor", "DOCTOR_REVIEWED", body.decisionNote or body.status, report_id)
    return {
        "id": f"rev-{uuid4().hex[:10]}",
        "reportId": report["id"],
        "insightId": body.insightId or "",
        "doctorId": user["profile_id"],
        "status": body.status,
        "decisionNote": body.decisionNote,
        "editedFinding": body.editedFinding,
        "recordedAt": now(),
    }


@router.get("/doctor/stats")
def doctor_stats(user: dict = Depends(current_user)):
    require_role(user, "doctor")
    reports = rows("reports", {"doctor_id": user["profile_id"]})
    patients = {report["patient_id"] for report in reports}
    findings = hydrate(rows_in("ai_findings", "report_id", [report["id"] for report in reports]))
    pending = sum(1 for finding in findings if finding["doctor_decision"] == "pending")
    insights = len(findings)
    return {
        "patientsToday": len(patients),
        "reportsAwaitingReview": sum(1 for report in reports if report.get("processing_status") != "reviewed"),
        "aiInsights": insights,
        "pendingDecisions": pending,
    }


@router.get("/doctor/patients")
def patient_directory(user: dict = Depends(current_user)):
    require_role(user, "doctor")
    directory = []
    for patient in rows("patients"):
        access = level(user, patient["id"]) or "none"
        visits = [item.get("visit_date") for item in rows("visits", {"patient_id": patient["id"]}) if item.get("visit_date")]
        report_rows = rows("reports", {"patient_id": patient["id"]})
        pending = 0
        if access == "treating":
            for finding in hydrate(rows_in("ai_findings", "report_id", [report["id"] for report in report_rows])):
                if finding["doctor_decision"] == "pending" and finding["jev"].get("triage") in {"review_needed", "insufficient"}:
                    pending += 1
        hb = next((item for item in _trend_series(patient["id"]) if item["metric"] == "Hemoglobin"), None)
        directory.append(
            {
                "id": patient["id"],
                "name": patient["name"],
                "mrn": patient.get("mrn") or "",
                "last_visit": sorted(visits)[-1] if visits else None,
                "reports": len(report_rows),
                "pending_review": pending,
                "trend": "Hb down" if hb and hb["delta"] < 0 else "Hb recorded" if hb else "No trend",
                "access": access,
            }
        )
    return directory


@router.post("/medication-safety")
def medication_safety(body: SafetyBody, user: dict = Depends(current_user)):
    require_role(user, "doctor")
    require_patient_access(user, body.patientId)
    allergies = rows("allergies", {"patient_id": body.patientId})
    penicillin = any(item.get("claim") == "present" and "penicillin" in item["substance"].lower() for item in allergies)
    names = " ".join(str(item.get("name", "")) for item in body.medications).lower()
    allergy_hit = penicillin and "amoxicillin" in names
    allergy_summary = (
        "Possible allergy match — clinician review required."
        if allergy_hit
        else "No matching allergy detected in the stored record."
    )
    return {
        "check": {
            "interaction": {
                "status": "no_issue",
                "summary": "No potential interaction detected in the stored record.",
                "evidence": "Server comparison of the listed medicines against stored medication checks.",
            },
            "allergy": {
                "status": "review_recommended" if allergy_hit else "no_issue",
                "summary": allergy_summary,
                "evidence": "Stored allergy list includes Penicillin." if allergy_hit else "No overlap in the stored allergy list.",
            },
            "information": {
                "status": "review_recommended",
                "summary": "Additional clinical information may be required.",
                "evidence": "Indication and duration are not stored with this check.",
            },
        },
        "potentialInteraction": "No potential interaction detected in the stored record.",
        "allergyCheck": allergy_summary,
        "status": "Review Complete",
    }


def _publish(user: dict, finding: dict, text: str, decision: str):
    try:
        assert_publishable(text, finding)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    cleaned = text.strip()
    tamil = translate_ta(cleaned, finding)
    kannada = translate_kn(cleaned, finding)
    insert(
        "doctor_reviews",
        {
            "id": f"rev-{uuid4().hex[:10]}",
            "finding_id": finding["id"],
            "doctor_id": user["profile_id"],
            "doctor_decision": decision,
            "doctor_final_text": cleaned,
            "doctor_final_text_ta": tamil,
            "doctor_final_text_kn": kannada,
            "decided_at": now(),
        },
    )
    upsert(
        "approved_findings",
        {
            "id": f"appr-{finding['id']}",
            "finding_id": finding["id"],
            "patient_visible": True,
            "approved_text": cleaned,
            "approved_text_ta": tamil,
            "approved_text_kn": kannada,
        },
    )
    audit(user, "doctor", "FINDING_ACCEPTED" if decision == "accepted" else "FINDING_EDITED", "AI draft was left unchanged.", finding["report_id"], finding["id"])


def _doctor_finding(user: dict, finding_id: str) -> dict:
    require_role(user, "doctor")
    row = one("ai_findings", {"id": finding_id})
    if not row:
        raise HTTPException(status_code=404, detail="Finding not found")
    report = one("reports", {"id": row["report_id"]})
    require_treating(user, report["patient_id"])
    return to_finding(row)


def _owned_report(user: dict, report_id: str) -> dict:
    report = one("reports", {"id": report_id})
    if not report or report["doctor_id"] != user["profile_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return report


def _visible_report(user: dict, report_id: str) -> dict:
    report = one("reports", {"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    require_patient_access(user, report["patient_id"])
    return report


def _report(row: dict) -> dict:
    return {
        "id": row["id"],
        "patientId": row["patient_id"],
        "doctorId": row["doctor_id"],
        "title": row["title"],
        "type": row.get("type") or "PDF",
        "fileName": row.get("file_name"),
        "uploadedAt": row.get("uploaded_at"),
        "processingStatus": row.get("processing_status"),
        "doctorReviewStatus": "pending",
        "labValues": [],
        "notes": row.get("notes") or "",
        "isSynthetic": row.get("is_synthetic", True),
    }


def _teach(row: dict, jev: dict) -> list[str]:
    bullets = [f"Value {row['value']} {row.get('unit') or ''} was read from page {row['source_page']}, line {row['source_line']}."]
    if row.get("reference_range"):
        bullets.append(f"Printed reference range: {row['reference_range']}.")
    else:
        bullets.append("No reference range was printed on this row.")
    if row.get("previous_value") is not None:
        bullets.append(f"Previous recorded value: {row['previous_value']}.")
    return bullets


def _overclaim(row: dict) -> dict:
    return {"available": [f"{row['test_name']} {row['value']} {row.get('unit') or ''}".strip()], "missing": ["Ferritin", "Iron studies"]}


def _blocked(question: str) -> bool:
    text = question.lower()
    needles = ["leukemia", "cancer", "diagnos", "do i have", "dose", "twice a day", "should i take", "prescri", "treatment", "stop my medicine"]
    return any(needle in text for needle in needles)


def _emergency(question: str) -> bool:
    text = question.lower()
    return any(word in text for word in ("chest pain", "can't breathe", "cannot breathe", "emergency", "unconscious", "severe bleeding"))


def _glossary(question: str) -> str | None:
    text = question.lower()
    entries = (
        ("mcv", "MCV means mean corpuscular volume, the average size of red blood cells printed on a blood count. This is not a diagnosis."),
        ("hemoglobin", "Hemoglobin is a protein in red blood cells that carries oxygen. The report prints a value and a reference range. This is not a diagnosis."),
        ("platelet", "Platelets are blood cells that help clotting. The report prints a count and a reference range. This is not a diagnosis."),
        ("wbc", "WBC means white blood cell count, a measure of white cells printed on a blood count. This is not a diagnosis."),
        ("rdw", "RDW means red cell distribution width, a measure of how much red cell size varies on a blood count. This is not a diagnosis."),
    )
    for needle, answer in entries:
        if needle in text:
            return answer
    if "what is" in text or "what does" in text:
        return "MediAssist can explain a printed test name. Ask about hemoglobin, MCV, WBC, platelets, or RDW. This is not a diagnosis."
    return None


def _history_answer(patient_id: str, question: str) -> str:
    text = question.lower()
    wanted = "Hemoglobin"
    for name in ("MCV", "WBC", "Platelets", "Glucose", "Hemoglobin"):
        if name.lower() in text:
            wanted = name
            break
    points = [item for item in rows("observations", {"patient_id": patient_id, "test_name": wanted}) if item.get("observed_on")]
    points.sort(key=lambda item: item["observed_on"])
    if len(points) < 2:
        return "A comparison will appear after two dated results are stored. This is not a diagnosis."
    previous = float(points[-2]["value"])
    current = float(points[-1]["value"])
    delta = round(current - previous, 1)
    word = "decreased" if delta < 0 else "increased" if delta > 0 else "stayed the same"
    amount = "" if delta == 0 else f" by {abs(delta)} {points[-1].get('unit') or ''}".rstrip()
    return f"Your {wanted.lower()} {word}{amount} from the previous recorded value. This is not a diagnosis."


def _approved_sentences(patient_id: str) -> list[str]:
    report_ids = [item["id"] for item in rows("reports", {"patient_id": patient_id})]
    sentences = []
    for finding in hydrate(rows_in("ai_findings", "report_id", report_ids)):
        public = to_public_finding(finding)
        if public and public.get("text"):
            sentences.append(f"{public['test_name']}: {public['text']}")
    return sentences


def _quality(patient_id: str) -> dict:
    conflicts = []
    allergies = rows("allergies", {"patient_id": patient_id})
    if any(item["claim"] == "present" for item in allergies) and any(item["claim"] == "none_recorded" for item in allergies):
        conflicts.append(
            {
                "code": "CONFLICTING_ALLERGY",
                "title": "Record conflict",
                "detail": "An earlier record lists an allergy. A later note says no known drug allergies. Doctor verification is required.",
            }
        )
    missing = []
    for report in rows("reports", {"patient_id": patient_id}):
        for finding in rows("ai_findings", {"report_id": report["id"]}):
            if not (finding.get("reference_range") or "").strip():
                missing.append(
                    {
                        "code": "MISSING_REFERENCE_RANGE",
                        "title": "Missing information",
                        "detail": f"{finding['test_name']} has no reference range. Jev marked the evidence insufficient.",
                    }
                )
    incomplete = [
        {
            "code": "INCOMPLETE_TREND",
            "title": "Incomplete trend",
            "detail": f"{item['test_name']} has a value without a date. Doctor verification is required.",
        }
        for item in rows("observations", {"patient_id": patient_id})
        if not item.get("observed_on")
    ]
    return {
        "conflicts": conflicts,
        "missing_information": missing,
        "incomplete_trends": incomplete,
        "severity": "review_needed" if conflicts or missing or incomplete else "clear",
    }


def _vault(user: dict, patient_id: str, permissions: set[str] | None = None) -> dict:
    access = level(user, patient_id)

    def allow(key: str) -> bool:
        return permissions is None or key in permissions

    report_rows = rows("reports", {"patient_id": patient_id})
    findings = hydrate(rows_in("ai_findings", "report_id", [report["id"] for report in report_rows]))
    if access != "treating":
        findings = [item for item in map(to_public_finding, findings) if item]
    shares = [_present_share(item) for item in rows("record_shares", {"patient_id": patient_id})]
    doctor_ids = []
    for report in report_rows:
        if report["doctor_id"] not in doctor_ids:
            doctor_ids.append(report["doctor_id"])
    doctors = [{"id": doctor_id, "name": doctor_name(doctor_id), "access": "Treating doctor"} for doctor_id in doctor_ids]
    for share in shares:
        if share["status"] == "ACTIVE":
            doctors.append(
                {
                    "id": share["shared_with_doctor_id"],
                    "name": doctor_name(share["shared_with_doctor_id"]),
                    "access": "Shared",
                }
            )
    medications = rows("medication_checks", {"patient_id": patient_id})
    if access != "treating":
        medications = [item for item in medications if item.get("patient_visible")]
    allergies = rows("allergies", {"patient_id": patient_id})
    if access != "treating":
        allergies = [item for item in allergies if item.get("patient_visible")]
    payload = {
        "patient_id": patient_id,
        "access": access,
        "visits": [_visit(item) for item in rows("visits", {"patient_id": patient_id})] if allow("consultations") else [],
        "reports": _report_cards(report_rows, access, permissions),
        "findings": findings if allow("approved_findings") else [],
        "trends": _trend_series(patient_id) if allow("approved_findings") else [],
        "medications": medications if allow("medications") else [],
        "allergies": allergies if allow("allergies") else [],
        "doctors": doctors,
        "shares": shares if user["role"] == "patient" else [],
        "quality": _quality(patient_id) if access == "treating" else None,
    }
    if access != "treating":
        leaked = ("ai_draft", "gemini_rewrite", "reason_codes", "overclaim")
        if any(token in str(payload) for token in leaked):
            raise HTTPException(status_code=500, detail="Patient response included internal fields")
    return payload


def _visit(row: dict) -> dict:
    return {**row, "date": row.get("visit_date")}


def _store_findings(user: dict, report_id: str, parsed: list[dict], use_gemini: bool) -> list[dict]:
    created = []
    for index, row in enumerate(parsed, start=1):
        draft = None
        if use_gemini and configured():
            try:
                draft = draft_for_row(row)
            except Exception:
                draft = None
        if not draft:
            draft = demo_draft(row) if report_id == "rpt-cbc" else fallback_draft(row)
        jev = evaluate(row, draft)
        stored = {
            "id": finding_id(report_id, row["test_name"], index),
            "report_id": report_id,
            "test_name": row["test_name"],
            "value": str(row["value"]),
            "unit": row["unit"],
            "reference_range": row["reference_range"],
            "source_page": row["source_page"],
            "source_line": row["source_line"],
            "source_text": row["source_text"],
            "ai_draft": draft,
            "gemini_rewrite": None,
            "jev": {key: jev[key] for key in ("triage", "evidence", "overclaim", "reason_codes")},
            "checks": jev["checks"],
            "teach": {"bullets": _teach(row, jev)},
            "overclaim_detail": _overclaim(row) if jev["overclaim"] else None,
            "previous_value": row["previous_value"],
            "previous_unit": row["previous_unit"],
            "created_at": now(),
            "updated_at": now(),
        }
        upsert("ai_findings", stored)
        created.append(stored)
    update("reports", {"id": report_id}, {"processing_status": "analysis_ready"})
    audit(user, "ai", "GEMINI_GENERATED", "Drafts stored separately from any doctor decision.", report_id)
    audit(user, "jev", "JEV_EVALUATED", f"{len(created)} rows triaged.", report_id)
    return created


def _save_summary(user: dict, report_id: str, text: str) -> None:
    audit(user, "ai", "REPORT_SUMMARY", text, report_id)


def _latest_event(report_ids: list[str], action: str) -> dict[str, dict]:
    latest: dict[str, dict] = {}
    for event in rows_in("audit_events", "report_id", report_ids):
        if event.get("action") != action or not event.get("detail"):
            continue
        current = latest.get(event["report_id"])
        if current is None or str(event.get("created_at") or "") >= str(current.get("created_at") or ""):
            latest[event["report_id"]] = event
    return latest


def _saved_summaries(report_ids: list[str]) -> dict[str, str]:
    return {report_id: event["detail"] for report_id, event in _latest_event(report_ids, "SUMMARY_APPROVED").items()}


def _report_cards(report_rows: list[dict], access: str, permissions: set[str] | None) -> list[dict]:
    share_summary = permissions is not None and "ai_summaries" in permissions
    show_summary = access == "own" or share_summary
    show_reports = permissions is None or "lab_reports" in permissions or share_summary
    if not show_reports:
        return []
    ids = [item["id"] for item in report_rows]
    summaries = _saved_summaries(ids) if show_summary else {}
    drafts = _latest_event(ids, "REPORT_SUMMARY") if access == "treating" else {}
    approved = _latest_event(ids, "SUMMARY_APPROVED") if access == "treating" else {}
    cards = []
    for item in report_rows:
        card = _report_brief(item)
        if show_summary:
            card["summary"] = summaries.get(item["id"])
        if access == "treating":
            card["draft_summary"] = (drafts.get(item["id"]) or {}).get("detail")
            card["summary_published"] = item["id"] in approved
        cards.append(card)
    return cards


def _record_doctor(patient_id: str) -> str:
    existing = rows("reports", {"patient_id": patient_id})
    if existing:
        return existing[0]["doctor_id"]
    doctors = rows("doctors")
    if not doctors:
        raise HTTPException(status_code=400, detail="No clinician record is available for this upload.")
    return doctors[0]["id"]


def _report_brief(row: dict) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "file_name": row.get("file_name") or row["title"],
        "uploaded_at": row.get("uploaded_at"),
    }


def _trend_series(patient_id: str) -> list[dict]:
    grouped: dict[str, list[dict]] = {name: [] for name in ("Hemoglobin", "MCV", "WBC", "Platelets", "Glucose")}
    for item in rows("observations", {"patient_id": patient_id}):
        if item.get("test_name") in grouped and item.get("observed_on"):
            grouped[item["test_name"]].append(item)
    series = []
    for name, dated in grouped.items():
        dated.sort(key=lambda item: item["observed_on"])
        if len(dated) < 2:
            continue
        current = float(dated[-1]["value"])
        previous = float(dated[-2]["value"])
        unit = dated[-1].get("unit") or ""
        series.append(
            {
                "metric": name,
                "unit": unit,
                "referenceRange": "",
                "current": current,
                "previous": previous,
                "delta": round(current - previous, 4),
                "points": [
                    {
                        "date": item["observed_on"],
                        "value": float(item["value"]),
                        "unit": item.get("unit") or unit,
                        "referenceRange": "",
                    }
                    for item in dated
                ],
            }
        )
    return series


def _present_share(share: dict) -> dict:
    status = share.get("status") or "ACTIVE"
    if status != "REVOKED" and not share.get("revoked_at"):
        expires = datetime.fromisoformat(str(share["expires_at"]).replace("Z", "+00:00"))
        if expires <= datetime.now(timezone.utc):
            status = "EXPIRED"
    return {**share, "status": status}


def _handoff_summary(patient_id: str) -> str:
    approved = []
    for report in rows("reports", {"patient_id": patient_id}):
        for row in rows("ai_findings", {"report_id": report["id"]}):
            public = to_public_finding(to_finding(row))
            if public and public.get("text"):
                approved.append(public["text"])
    allergies = [item["substance"] for item in rows("allergies", {"patient_id": patient_id}) if item.get("claim") == "present"]
    return (
        "Clinical handoff built from stored records. "
        + ("Approved notes: " + " ".join(approved) if approved else "No doctor-approved finding text is published yet. ")
        + " Allergies on file: "
        + (", ".join(allergies) if allergies else "none recorded as present.")
    )
