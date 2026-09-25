"""Load synthetic demo records into Supabase. Safe to run more than once."""

from app.db import upsert
from app.extract import SYNTHETIC_CBC, finding_id, parse_report
from app.jev import demo_draft, evaluate
from app.security import hash_password

DOCTORS = [
    {"id": "doctor-2", "name": "Dr. Madhu", "title": "Internal Medicine", "specialty": "Internal Medicine", "email": "priya.nair@mediassist.demo"},
    {"id": "doctor-1", "name": "Dr. Smiley", "title": "General Physician", "specialty": "General Medicine", "email": "sarah.wilson@mediassist.demo"},
    {"id": "doctor-3", "name": "Dr. Shwetha", "title": "Hematology", "specialty": "Hematology", "email": "rahul.menon@mediassist.demo"},
]

PATIENTS = [
    {"id": "patient-arun", "name": "Agnes", "age": 34, "sex": "Female", "email": "arun.kumar@mediassist.demo", "mrn": "MRN-10428"},
]


def main() -> None:
    upsert("doctors", DOCTORS)
    upsert("patients", PATIENTS)
    users = []
    for doctor in DOCTORS:
        users.append(
            {
                "id": f"user-{doctor['id']}",
                "email": doctor["email"],
                "password_hash": hash_password("demo"),
                "role": "doctor",
                "full_name": doctor["name"],
                "profile_id": doctor["id"],
            }
        )
    users.append(
        {
            "id": "user-patient-arun",
            "email": "arun.kumar@mediassist.demo",
            "password_hash": hash_password("demo"),
            "role": "patient",
            "full_name": "Agnes",
            "profile_id": "patient-arun",
        }
    )
    upsert("users", users)
    upsert(
        "reports",
        {
            "id": "rpt-cbc",
            "patient_id": "patient-arun",
            "doctor_id": "doctor-2",
            "title": "CBC Report",
            "type": "CBC",
            "file_name": "CBC_Report.pdf",
            "processing_status": "analysis_ready",
            "is_synthetic": True,
            "notes": "Synthetic September CBC.",
            "extracted_text": SYNTHETIC_CBC,
        },
    )
    findings = []
    for index, row in enumerate(parse_report(SYNTHETIC_CBC), start=1):
        draft = demo_draft(row)
        jev = evaluate(row, draft)
        findings.append(
            {
                "id": finding_id("rpt-cbc", row["test_name"], index),
                "report_id": "rpt-cbc",
                "test_name": row["test_name"],
                "value": str(row["value"]),
                "unit": row["unit"],
                "reference_range": row["reference_range"],
                "source_page": row["source_page"],
                "source_line": row["source_line"],
                "source_text": row["source_text"],
                "ai_draft": draft,
                "jev": {key: jev[key] for key in ("triage", "evidence", "overclaim", "reason_codes")},
                "checks": jev["checks"],
                "teach": {"bullets": [row["source_text"]]},
                "previous_value": row["previous_value"],
                "previous_unit": row["previous_unit"],
            }
        )
    upsert("ai_findings", findings)
    upsert(
        "visits",
        [
            {"id": "visit-mar", "patient_id": "patient-arun", "visit_date": "2026-03-12", "label": "March visit", "report_id": "rpt-cbc-mar", "file_name": "CBC_Mar_2026.pdf", "summary": "CBC report"},
            {"id": "visit-jul", "patient_id": "patient-arun", "visit_date": "2026-07-18", "label": "July visit", "report_id": "rpt-cbc-jul", "file_name": "CBC_Jul_2026.pdf", "summary": "CBC report and consultation"},
            {"id": "visit-sep", "patient_id": "patient-arun", "visit_date": "2026-09-22", "label": "September visit", "report_id": "rpt-cbc", "file_name": "CBC_Report.pdf", "summary": "CBC report"},
        ],
    )
    observations = []
    series = {
        "Hemoglobin": ("g/dL", [11.2, 10.6, 9.8]),
        "MCV": ("fL", [78, 75, 72]),
        "WBC": ("x10^3/uL", [7.2, 7.1, 7.4]),
        "Platelets": ("x10^3/uL", [220, 224, 228]),
    }
    dates = ["2026-03-12", "2026-07-18", "2026-09-22"]
    for name, (unit, values) in series.items():
        for date, value in zip(dates, values):
            observations.append(
                {
                    "id": f"obs-{name.lower()}-{date}",
                    "patient_id": "patient-arun",
                    "test_name": name,
                    "value": value,
                    "unit": unit,
                    "observed_on": date,
                    "file_name": "CBC_Report.pdf" if date == "2026-09-22" else f"CBC_{date}.pdf",
                    "source_page": 1,
                    "source_line": 8 if name == "Hemoglobin" else 9,
                    "source_text": f"{name} {value} {unit}",
                }
            )
    observations.append(
        {
            "id": "obs-hb-undated",
            "patient_id": "patient-arun",
            "test_name": "Hemoglobin",
            "value": 10.1,
            "unit": "g/dL",
            "observed_on": None,
            "file_name": "CBC_Jul_2026.pdf",
            "source_page": 1,
            "source_line": 8,
            "source_text": "Hemoglobin 10.1 g/dL",
        }
    )
    upsert("observations", observations)
    upsert(
        "allergies",
        [
            {"id": "alg-penicillin", "patient_id": "patient-arun", "substance": "Penicillin", "source": "Patient allergy record", "recorded_at": "2026-03-12", "claim": "present", "patient_visible": True},
            {"id": "alg-none-july", "patient_id": "patient-arun", "substance": "No known drug allergies", "source": "July consultation note", "recorded_at": "2026-07-18", "claim": "none_recorded", "patient_visible": False},
        ],
    )
    upsert(
        "medication_checks",
        [{
            "id": "safe-para",
            "patient_id": "patient-arun",
            "medication": "Paracetamol",
            "allergy": "No recorded relevant allergy",
            "interaction": "No configured concern",
            "evidence": "Patient profile",
            "status": "clear",
            "doctor_decision": "approved",
            "why": ["No configured relationship in the demo rule set."],
            "patient_visible": True,
        },
        {
            "id": "safe-amox",
            "patient_id": "patient-arun",
            "medication": "Amoxicillin",
            "allergy": "Penicillin",
            "interaction": "Possible class overlap with a recorded allergy",
            "evidence": "Patient allergy record lists Penicillin.",
            "status": "warning",
            "doctor_decision": "pending",
            "why": ["A recorded allergy and this medicine share a class in the demo rule set."],
            "patient_visible": False,
        }],
    )
    print(f"Seeded {len(findings)} findings for Arun Kumar. Demo password: demo")


if __name__ == "__main__":
    main()
