import { compareSeries } from "./clinicalContext";
import { assertPublishable } from "./policy";
import type {
  ClinicalHandoff,
  DataQualityReport,
  DemoState,
  FindingCard,
  RecordShare,
  SharePermission,
} from "./types";

export class AccessError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface Actor {
  role: "doctor" | "patient";
  id: string;
  name: string;
}

const TREATING: Record<string, string> = {
  "patient-arun": "doctor-2",
};

export function isApproved(finding: FindingCard) {
  return (
    finding.patient_visible === true &&
    finding.doctor_decision !== "rejected" &&
    finding.doctor_decision !== "pending" &&
    Boolean(finding.final_text)
  );
}

export function publicFinding(finding: FindingCard) {
  return {
    id: finding.id,
    test_name: finding.test_name,
    value: finding.value,
    unit: finding.unit,
    reference_range: finding.reference_range,
    text: finding.final_text,
    source_page: finding.source.page,
    source_line: finding.source.line_start,
    source_text: finding.source.excerpt,
    doctor_name: finding.doctor_name,
    decided_at: finding.decided_at,
  };
}

export function accessLevel(state: DemoState, actor: Actor, patientId: string, now = new Date()) {
  if (actor.role === "patient" && actor.id === patientId) return "own" as const;
  if (actor.role === "doctor" && TREATING[patientId] === actor.id) return "treating" as const;
  if (actor.role === "doctor" && activeShareFor(state, patientId, actor.id, now)) return "shared" as const;
  return null;
}

export function assertAccess(state: DemoState, actor: Actor, patientId: string, now = new Date()) {
  const level = accessLevel(state, actor, patientId, now);
  if (!level) throw new AccessError(403, "Forbidden");
  return level;
}

function activeShareFor(state: DemoState, patientId: string, doctorId: string, now: Date) {
  return state.shares.find(
    (share) =>
      share.patient_id === patientId &&
      share.shared_with_doctor_id === doctorId &&
      shareStatus(share, now) === "ACTIVE",
  );
}

export function shareStatus(share: RecordShare, now = new Date()): RecordShare["status"] {
  if (share.status === "REVOKED" || share.revoked_at) return "REVOKED";
  if (new Date(share.expires_at).getTime() <= now.getTime()) return "EXPIRED";
  return "ACTIVE";
}

export function healthVault(state: DemoState, actor: Actor, patientId: string, now = new Date()) {
  const level = assertAccess(state, actor, patientId, now);
  const share = level === "shared" ? activeShareFor(state, patientId, actor.id, now) : null;
  const allow = (key: SharePermission) => level !== "shared" || Boolean(share?.permissions.includes(key));
  const findings = state.findings.filter((item) => reportsFor(state, patientId).some((report) => report.id === item.report_id));
  const approved = findings.filter(isApproved).map(publicFinding);
  const payload = {
    patient_id: patientId,
    access: level,
    visits: state.visits.filter((item) => item.patient_id === patientId),
    reports: allow("lab_reports")
      ? reportsFor(state, patientId).map((report) => ({
          id: report.id,
          title: report.title,
          file_name: report.fileName ?? report.title,
          uploaded_at: report.uploadedAt,
          summary: null as string | null,
          draft_summary: null as string | null,
          summary_published: false,
        }))
      : [],
    findings: allow("approved_findings") ? (level === "treating" ? findings : approved) : [],
    trends: allow("approved_findings") ? datedTrends(state, patientId) : [],
    medications: allow("medications")
      ? state.safetyChecks.filter(
          (item) => item.patient_id === patientId && (level === "treating" || item.patient_visible),
        )
      : [],
    allergies: allow("allergies")
      ? state.allergies.filter(
          (item) => item.patient_id === patientId && (level === "treating" || item.patient_visible),
        )
      : [],
    doctors: [
      { id: TREATING[patientId], name: "Dr. Madhu", access: "Treating doctor" },
      ...state.shares
        .filter((item) => item.patient_id === patientId && shareStatus(item, now) === "ACTIVE")
        .map((item) => ({ id: item.shared_with_doctor_id, name: item.shared_with_doctor_id, access: "Shared" })),
    ],
    shares: actor.role === "patient" ? state.shares.filter((item) => item.patient_id === patientId) : [],
    quality: level === "treating" ? dataQuality(state, patientId) : null,
  };
  const serialized = JSON.stringify(payload);
  if (level !== "treating" && /ai_draft|gemini_rewrite|reason_codes|overclaim/.test(serialized)) {
    throw new AccessError(500, "Patient response included internal fields");
  }
  return payload;
}

function reportsFor(state: DemoState, patientId: string) {
  return state.reports.filter((report) => report.patientId === patientId);
}

export function datedTrends(state: DemoState, patientId: string) {
  const names = ["Hemoglobin", "MCV", "WBC", "Platelets", "Glucose"];
  return names
    .map((metric) => {
      const points = state.observations
        .filter((item) => item.patient_id === patientId && item.test_name === metric && item.date)
        .map((item) => ({ date: item.date, value: item.value }));
      const comparison = compareSeries(points);
      return comparison
        ? {
            metric,
            current: comparison.current.value,
            previous: comparison.previous.value,
            delta: comparison.delta,
            points: comparison.points,
          }
        : null;
    })
    .filter((item) => item !== null);
}

export function dataQuality(state: DemoState, patientId: string): DataQualityReport {
  const conflicts = [];
  const allergies = state.allergies.filter((item) => item.patient_id === patientId);
  const hasAllergy = allergies.some((item) => item.claim === "present");
  const deniesAllergy = allergies.some((item) => item.claim === "none_recorded");
  if (hasAllergy && deniesAllergy) {
    conflicts.push({
      code: "CONFLICTING_ALLERGY",
      title: "Record conflict",
      detail: "An earlier record lists Penicillin. A later note says no known drug allergies. Doctor verification is required.",
    });
  }
  const missing = state.findings
    .filter((item) => !item.checks.reference_available || !item.reference_range.trim())
    .map((item) => ({
      code: "MISSING_REFERENCE_RANGE",
      title: "Missing information",
      detail: `${item.test_name} has no reference range. Jev marked the evidence insufficient. Doctor review is required.`,
    }));
  const incomplete = state.observations
    .filter((item) => item.patient_id === patientId && !item.date)
    .map((item) => ({
      code: "INCOMPLETE_TREND",
      title: "Incomplete trend",
      detail: `${item.test_name} has a stored value without a date. Doctor verification is required.`,
    }));
  return {
    conflicts,
    missing_information: missing,
    incomplete_trends: incomplete,
    severity: conflicts.length || missing.length || incomplete.length ? "review_needed" : "clear",
  };
}

export function nextShareToken(existing: string[]) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let n = 1842 + existing.length * 17;
  let token = "MA-";
  for (let index = 0; index < 4; index += 1) {
    token += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) + 11;
  }
  return token;
}

export function buildHandoffSummary(state: DemoState, patientId: string) {
  const approved = state.findings.filter(isApproved);
  const trends = datedTrends(state, patientId);
  const hb = trends.find((item) => item.metric === "Hemoglobin");
  const lines = [
    "Clinical handoff built from stored records.",
    hb ? `Hemoglobin recorded values change by ${hb.delta} from the previous dated result (${hb.previous} to ${hb.current}).` : "No dated hemoglobin series is stored.",
    approved.length
      ? `Approved notes: ${approved.map((item) => item.final_text).join(" ")}`
      : "No doctor-approved finding text is published yet.",
    `Allergies on file: ${state.allergies
      .filter((item) => item.patient_id === patientId && item.claim === "present")
      .map((item) => item.substance)
      .join(", ") || "None recorded as present."}`,
  ];
  return lines.join(" ");
}

export function evidenceTrace(finding: FindingCard) {
  return {
    statement: finding.final_text ?? finding.ai_draft,
    value: finding.value,
    unit: finding.unit,
    reference_range: finding.reference_range,
    file_name: "CBC_Report.pdf",
    source_page: finding.source.page,
    source_line: finding.source.line_start,
    source_text: finding.source.excerpt,
    evidence: finding.jev?.evidence ?? "insufficient",
  };
}

export function canApprove(finding: FindingCard, text: string) {
  assertPublishable(text, finding);
  return true;
}

export type { ClinicalHandoff, SharePermission };
