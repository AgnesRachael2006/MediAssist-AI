import {
  DEMO_DOCTOR,
  DEMO_DOCTORS,
  DEMO_PATIENTS,
  buildPatientExplanation,
  createSeedState,
  getDoctorById,
  getPatientById,
} from "./mockData";
import {
  clearSession,
  getRegisteredAccounts,
  saveRegisteredAccount,
} from "./session";
import { getDemoState, patchDemoState, resetDemoState } from "./store";
import type {
  AIInsight,
  AppNotification,
  AuditAction,
  AuditLog,
  ChatMessage,
  DashboardStats,
  DoctorReview,
  DoctorReviewStatus,
  HealthTrend,
  MedicalReport,
  Medication,
  MedicationSafetyCheck,
  PatientExplanation,
  SafetyCheckInput,
  SafetyCheckResult,
  SessionUser,
} from "./types";
import { isDoctorReviewed } from "./types";

/**
 * Mock API layer for the hackathon frontend.
 * Replace function bodies with FastAPI fetch calls later.
 * Never place Gemini (or other model) API keys in this file.
 *
 * Intended live path: Next.js → FastAPI → Gemini / Supabase
 */
const USE_MOCK = process.env.NEXT_PUBLIC_API_MODE !== "live";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function wait(ms = 420) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function addAudit(
  reportId: string,
  actor: string,
  action: AuditAction,
  detail: string,
  timestamp = nowIso(),
): AuditLog {
  const entry: AuditLog = {
    id: id("aud"),
    reportId,
    actor,
    action,
    detail,
    timestamp,
  };
  patchDemoState((state) => ({
    ...state,
    auditLogs: [...state.auditLogs, entry],
  }));
  return entry;
}

function addNotification(item: Omit<AppNotification, "id">) {
  const entry: AppNotification = { ...item, id: id("ntf") };
  patchDemoState((state) => ({
    ...state,
    notifications: [entry, ...state.notifications],
  }));
  return entry;
}

export function markNotificationRead(notificationId: string) {
  patchDemoState((state) => ({
    ...state,
    notifications: state.notifications.map((item) =>
      item.id === notificationId ? { ...item, read: true } : item,
    ),
  }));
}

export function markNotificationsRead(role: SessionUser["role"], patientId?: string) {
  patchDemoState((state) => ({
    ...state,
    notifications: state.notifications.map((item) => {
      if (item.audience !== role) return item;
      if (role === "patient" && item.patientId && item.patientId !== patientId) return item;
      return { ...item, read: true };
    }),
  }));
}

async function liveRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function sessionFromDoctor(email: string, doctor = DEMO_DOCTOR): SessionUser {
  return {
    role: "doctor",
    email: email || doctor.email,
    name: doctor.name,
    profileId: doctor.id,
    title: doctor.title,
  };
}

function sessionFromPatient(email: string, patient = DEMO_PATIENTS[0]): SessionUser {
  return {
    role: "patient",
    email: email || patient.email,
    name: patient.name.split(" ")[0],
    profileId: patient.id,
    title: "Patient",
  };
}

export async function login(email: string, password: string): Promise<SessionUser> {
  await wait(350);
  if (!USE_MOCK) {
    return liveRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }
  const normalized = email.trim().toLowerCase();
  const doctor = DEMO_DOCTORS.find((item) => item.email.toLowerCase() === normalized);
  if (doctor) return sessionFromDoctor(email, doctor);
  const patient = DEMO_PATIENTS.find((item) => item.email.toLowerCase() === normalized);
  if (patient) return sessionFromPatient(email, patient);
  const registered = getRegisteredAccounts().find(
    (item) => item.email.toLowerCase() === normalized,
  );
  if (registered) {
    if (registered.password && registered.password !== password) {
      throw new Error("Invalid credentials");
    }
    if (registered.role === "doctor") {
      return {
        role: "doctor",
        email: registered.email,
        name: registered.fullName.startsWith("Dr.")
          ? registered.fullName
          : `Dr. ${registered.fullName}`,
        profileId: DEMO_DOCTOR.id,
        title: "Clinician (demo)",
      };
    }
    return {
      role: "patient",
      email: registered.email,
      name: registered.fullName.split(" ")[0],
      profileId: DEMO_PATIENTS[0].id,
      title: "Patient",
    };
  }
  throw new Error("Account not found");
}

export async function signup(input: {
  fullName: string;
  email: string;
  password: string;
  role: SessionUser["role"];
}): Promise<SessionUser> {
  await wait(400);
  if (!USE_MOCK) {
    return liveRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  saveRegisteredAccount(input);
  return login(input.email, input.password);
}

export async function logout(): Promise<void> {
  await wait(150);
  if (!USE_MOCK) {
    await liveRequest("/auth/logout", { method: "POST" });
  }
  clearSession();
}

export async function getReports(): Promise<MedicalReport[]> {
  await wait();
  if (!USE_MOCK) return liveRequest("/reports");
  return [...getDemoState().reports].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
}

export async function getReport(idValue: string): Promise<MedicalReport | null> {
  await wait();
  if (!USE_MOCK) return liveRequest(`/reports/${idValue}`);
  return getDemoState().reports.find((report) => report.id === idValue) ?? null;
}

export async function getPatientReports(patientId: string): Promise<MedicalReport[]> {
  await wait();
  if (!USE_MOCK) return liveRequest(`/patients/${patientId}/reports`);
  return getDemoState()
    .reports.filter((report) => report.patientId === patientId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export async function getInsightForReport(reportId: string): Promise<AIInsight | null> {
  await wait(200);
  if (!USE_MOCK) return liveRequest(`/reports/${reportId}/insight`);
  return getDemoState().insights.find((insight) => insight.reportId === reportId) ?? null;
}

export async function getReviewForReport(reportId: string): Promise<DoctorReview | null> {
  return getDoctorReview(reportId);
}

export async function getDoctorReview(reportId: string): Promise<DoctorReview | null> {
  await wait(150);
  if (!USE_MOCK) return liveRequest(`/reports/${reportId}/review`);
  const reviews = getDemoState().reviews.filter((review) => review.reportId === reportId);
  return reviews.at(-1) ?? null;
}

export async function getAuditTrail(reportId?: string): Promise<AuditLog[]> {
  await wait(200);
  if (!USE_MOCK) {
    const query = reportId ? `?reportId=${reportId}` : "";
    return liveRequest(`/audit${query}`);
  }
  const logs = getDemoState().auditLogs;
  const filtered = reportId ? logs.filter((log) => log.reportId === reportId) : logs;
  return [...filtered].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await wait();
  if (!USE_MOCK) return liveRequest("/doctor/stats");
  const reports = getDemoState().reports;
  return {
    patientsToday: 8,
    reportsAwaitingReview: reports.filter((report) => report.doctorReviewStatus === "pending")
      .length,
    aiInsights: getDemoState().insights.length,
    pendingDecisions: reports.filter((report) => report.doctorReviewStatus === "pending").length,
  };
}

export async function uploadReport(
  fileName: string,
  patientId = "patient-arun",
): Promise<MedicalReport> {
  await wait(700);
  if (!USE_MOCK) {
    return liveRequest("/reports/upload", {
      method: "POST",
      body: JSON.stringify({ fileName, patientId }),
    });
  }
  const report: MedicalReport = {
    id: id("rpt"),
    patientId,
    doctorId: "doctor-1",
    title: fileName.replace(/\.[^.]+$/, "") || "Uploaded Report",
    type: "PDF",
    uploadedAt: nowIso(),
    processingStatus: "processing",
    doctorReviewStatus: "pending",
    isSynthetic: true,
    notes: "Uploaded in demo mode. File is not sent to a server. Synthetic values applied.",
    labValues: createSeedState().reports[0].labValues,
  };
  patchDemoState((state) => ({ ...state, reports: [report, ...state.reports] }));
  addAudit(report.id, "System", "report_uploaded", `${fileName} uploaded (demo).`);
  addNotification({
    audience: "patient",
    patientId,
    title: "A new report was uploaded.",
    body: `${report.title} is being prepared for clinician review.`,
    tone: "info",
    createdAt: nowIso(),
    read: false,
    href: "/patient/reports",
  });
  addNotification({
    audience: "doctor",
    title: "A new report was uploaded.",
    body: `${report.title} is moving through extraction and analysis.`,
    tone: "info",
    createdAt: nowIso(),
    read: false,
    href: `/doctor/reports/${report.id}`,
  });
  return report;
}

export async function analyzeReport(reportId: string): Promise<AIInsight> {
  await wait(1100);
  if (!USE_MOCK) {
    return liveRequest(`/reports/${reportId}/analyze`, { method: "POST" });
  }
  const existing = getDemoState().insights.find((insight) => insight.reportId === reportId);
  if (existing) {
    patchDemoState((state) => ({
      ...state,
      reports: state.reports.map((report) =>
        report.id === reportId
          ? { ...report, processingStatus: "analysis_ready" }
          : report,
      ),
    }));
    return existing;
  }
  const insight: AIInsight = {
    id: id("ins"),
    reportId,
    title: "Platelet value near lower reference bound",
    finding:
      "Platelet count is near the lower end of the provided reference range.",
    consideration: "This is a finding for clinician review, not a diagnosis.",
    evidence: "CBC report",
    evidenceStrength: "moderate",
    supportingInformation: [
      "Platelet value 145,000 /µL against 150,000 – 450,000",
      "Temperature 38.2°C recorded with the panel",
    ],
    missingInformation: ["Previous platelet values", "Duration of symptoms"],
    recommendedReview:
      "Consider reviewing the patient's clinical history and previous results.",
    reviewRecommended: true,
  };
  patchDemoState((state) => ({
    ...state,
    insights: [...state.insights, insight],
    reports: state.reports.map((report) =>
      report.id === reportId
        ? { ...report, processingStatus: "analysis_ready" }
        : report,
    ),
  }));
  addAudit(reportId, "MediAssist AI", "ai_analysis_generated", "AI clinical insight generated.");
  addAudit(reportId, "MediAssist AI", "ai_finding_created", "AI finding created for review.");
  return insight;
}

export async function loadDemoReport(): Promise<MedicalReport> {
  const report = await uploadReport("Demo-CBC-Arun-Kumar.pdf");
  await analyzeReport(report.id);
  return (await getReport(report.id)) as MedicalReport;
}

export async function loadDemoPatient() {
  await wait(200);
  return DEMO_PATIENTS[0];
}

export async function submitDoctorReview(input: {
  reportId: string;
  insightId: string;
  status: Exclude<DoctorReviewStatus, "pending">;
  decisionNote: string;
  editedFinding?: string;
}): Promise<DoctorReview> {
  await wait(500);
  if (!USE_MOCK) {
    return liveRequest(`/reports/${input.reportId}/review`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  const review: DoctorReview = {
    id: id("rev"),
    reportId: input.reportId,
    insightId: input.insightId,
    doctorId: DEMO_DOCTOR.id,
    status: input.status,
    decisionNote: input.decisionNote,
    editedFinding: input.editedFinding,
    recordedAt: nowIso(),
  };
  const processingStatus =
    input.status === "rejected" ? "needs_review" : "reviewed";
  const report = getDemoState().reports.find((item) => item.id === input.reportId);
  patchDemoState((state) => ({
    ...state,
    reviews: [
      ...state.reviews.filter((item) => item.reportId !== input.reportId),
      review,
    ],
    reports: state.reports.map((item) =>
      item.id === input.reportId
        ? {
            ...item,
            doctorReviewStatus: input.status,
            processingStatus,
          }
        : item,
    ),
  }));
  addAudit(
    input.reportId,
    DEMO_DOCTOR.name,
    "doctor_reviewed",
    "Doctor reviewed AI finding.",
  );
  const actionMap = {
    accepted: "doctor_accepted",
    modified: "doctor_modified",
    rejected: "doctor_rejected",
  } as const;
  addAudit(
    input.reportId,
    DEMO_DOCTOR.name,
    actionMap[input.status],
    `Doctor ${input.status} AI insight.`,
  );
  if (input.status === "accepted" || input.status === "modified") {
    addAudit(
      input.reportId,
      "MediAssist AI",
      "patient_explanation_generated",
      "Patient explanation generated after doctor approval.",
    );
    addNotification({
      audience: "patient",
      patientId: report?.patientId,
      title: `Your report has been reviewed by ${DEMO_DOCTOR.name}.`,
      body: `${report?.title ?? "Your report"} is ready to view.`,
      tone: "success",
      createdAt: nowIso(),
      read: false,
      href: report ? `/patient/reports/${report.id}` : "/patient/doctor-reviews",
    });
    addNotification({
      audience: "patient",
      patientId: report?.patientId,
      title: "Your patient-friendly explanation is ready.",
      body: "You can read and listen to the doctor-reviewed explanation.",
      tone: "success",
      createdAt: nowIso(),
      read: false,
      href: report ? `/patient/report-voice?report=${report.id}` : "/patient/report-voice",
    });
  }
  return review;
}

export async function getPatientExplanation(
  reportId: string,
): Promise<PatientExplanation | null> {
  return getReportExplanation(reportId);
}

export async function getReportExplanation(
  reportId: string,
): Promise<PatientExplanation | null> {
  await wait(200);
  if (!USE_MOCK) return liveRequest(`/reports/${reportId}/patient-explanation`);
  const state = getDemoState();
  const report = state.reports.find((item) => item.id === reportId);
  if (!report) return null;
  if (!isDoctorReviewed(report.doctorReviewStatus)) return null;
  const review = state.reviews.filter((item) => item.reportId === reportId).at(-1) ?? null;
  return buildPatientExplanation(report, review);
}

export async function markExplanationViewed(reportId: string) {
  const already = getDemoState().auditLogs.some(
    (log) => log.reportId === reportId && log.action === "patient_viewed_explanation",
  );
  if (already) return;
  addAudit(
    reportId,
    "Patient",
    "patient_viewed_explanation",
    "Patient viewed doctor-reviewed explanation.",
  );
}

export async function getPatientHealthTrends(patientId: string): Promise<HealthTrend[]> {
  await wait(250);
  if (!USE_MOCK) return liveRequest(`/patients/${patientId}/trends`);
  const reports = getDemoState()
    .reports.filter((report) => report.patientId === patientId)
    .sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
  const buckets = new Map<string, HealthTrend>();
  for (const report of reports) {
    for (const lab of report.labValues) {
      const numeric = Number(String(lab.value).replace(/,/g, ""));
      if (Number.isNaN(numeric)) continue;
      const existing = buckets.get(lab.label) ?? {
        metric: lab.label,
        unit: lab.unit,
        referenceRange: lab.referenceRange,
        points: [],
      };
      existing.points.push({
        date: report.uploadedAt,
        value: numeric,
        unit: lab.unit,
        referenceRange: lab.referenceRange,
      });
      buckets.set(lab.label, existing);
    }
  }
  return [...buckets.values()];
}

export async function getNotifications(role: SessionUser["role"], patientId?: string) {
  await wait(120);
  return getDemoState().notifications.filter((item) => {
    if (item.audience !== role) return false;
    if (role === "patient") return !item.patientId || item.patientId === patientId;
    return true;
  });
}

export async function runSafetyCheck(input: SafetyCheckInput): Promise<SafetyCheckResult> {
  await wait(650);
  if (!USE_MOCK) {
    return liveRequest("/medication-safety", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  const patient = getPatientById(input.patientId);
  const names = input.medications.map((item) => item.name.toLowerCase()).join(" ");
  const allergyHit =
    (patient?.allergies.join(" ").toLowerCase().includes("penicillin") ?? false) &&
    names.includes("amoxicillin");
  const missingHistory = !patient?.currentMedications.length && input.medications.length > 0;
  const check: MedicationSafetyCheck = {
    interaction: {
      status: "no_issue",
      summary: "No potential interaction detected in demo data.",
      evidence:
        "Demo formulary comparison of the listed medications did not surface a known pairing in this prototype set.",
    },
    allergy: {
      status: allergyHit ? "review_recommended" : "no_issue",
      summary: allergyHit
        ? "Possible allergy match in demo data — clinician review required."
        : "No matching allergy detected.",
      evidence: allergyHit
        ? "Patient allergy list includes penicillin; a listed medication contains an overlapping class in demo data."
        : "No overlap between recorded allergies and listed medications in demo data.",
    },
    information: {
      status: missingHistory ? "information_missing" : "review_recommended",
      summary: missingHistory
        ? "Additional clinical information may be required."
        : "Additional clinical information may be required.",
      evidence:
        "The system identified information that should be reviewed by the clinician, including duration of therapy and indication.",
    },
  };
  addAudit(
    "safety",
    DEMO_DOCTOR.name,
    "medication_check_performed",
    `Medication safety check for ${patient?.name ?? "patient"} (demo).`,
  );
  addAudit(
    "safety",
    DEMO_DOCTOR.name,
    "safety_check_run",
    `Checked ${input.medications.map((item) => item.name).join(", ") || "medication"} (demo).`,
  );
  return {
    check,
    potentialInteraction: check.interaction.summary,
    allergyCheck: check.allergy.summary,
    status: "Review Complete",
  };
}

export async function recordMedicationDecision(
  patientId: string,
  decision: "approve" | "modify" | "reject",
) {
  await wait(300);
  const patient = getPatientById(patientId);
  addAudit(
    "safety",
    DEMO_DOCTOR.name,
    "medication_decision_recorded",
    `Doctor ${decision}d medication safety review for ${patient?.name ?? "patient"}.`,
  );
  addAudit("safety", DEMO_DOCTOR.name, "doctor_reviewed", "Doctor reviewed medication safety check.");
}

export async function getMedicationSafetyCheck(
  input: SafetyCheckInput,
): Promise<MedicationSafetyCheck> {
  const result = await runSafetyCheck(input);
  return result.check;
}

const ASK_LIBRARY: Array<{ match: RegExp; reply: string }> = [
  {
    match: /hemoglobin|hb\b/i,
    reply:
      "Hemoglobin is a protein in red blood cells that carries oxygen. Your report lists a number next to a laboratory reference range. Being a little below or above that printed range is an observation for your doctor to interpret — not a diagnosis.",
  },
  {
    match: /wbc|white blood/i,
    reply:
      "WBC means white blood cell count. These cells are part of the body's usual defense system. The test measures how many are in a sample of blood compared with the lab's listed range. Ask your doctor what your number means in your situation.",
  },
  {
    match: /platelet/i,
    reply:
      "Platelet count measures cell fragments that help blood clot. Your report shows a value and a reference range provided by the lab. A number near either end of that range is something to discuss with your doctor. This is educational information only.",
  },
  {
    match: /glucose|sugar/i,
    reply:
      "Glucose is a blood sugar measurement. Laboratories print a reference interval on the report. A value outside that interval is an observation. Your doctor decides whether it needs follow-up. MediAssist does not diagnose diabetes or any other condition.",
  },
  {
    match: /temperature|fever/i,
    reply:
      "Temperature is a vital sign recorded with some reports. The listed range is a typical interval printed for this demo. A higher reading is something to mention to your doctor, along with how long you have felt unwell.",
  },
  {
    match: /why.*(test|cbc|blood)/i,
    reply:
      "Clinicians often order a complete blood count to look at blood cells and related measurements together. The exact reason for your test is a clinical decision. Ask your doctor why this panel was chosen for you.",
  },
  {
    match: /simple|explain|mean/i,
    reply:
      "Your report lists measurements next to laboratory reference ranges. Values inside a range are described as within that printed interval. Values outside or near a bound are observations, not a disease name. Only your doctor-reviewed explanation is the approved summary for you.",
  },
];

export async function askMediAssist(
  question: string,
  reportTitle?: string,
): Promise<ChatMessage> {
  await wait(500);
  if (!USE_MOCK) {
    return liveRequest("/assistant/ask", {
      method: "POST",
      body: JSON.stringify({ question, reportTitle }),
    });
  }
  const hit = ASK_LIBRARY.find((item) => item.match.test(question));
  const context = reportTitle ? ` You asked this while discussing ${reportTitle}.` : "";
  const reply =
    (hit?.reply ??
      "I can help explain medical terms and what a test measures in general language. I cannot diagnose, prescribe, or replace your doctor. Please share a term from your report, such as hemoglobin or platelet count.") +
    context +
    " MediAssist provides educational explanations. Your doctor makes clinical decisions.";
  return {
    id: id("chat"),
    role: "assistant",
    content: reply,
    createdAt: nowIso(),
  };
}

export function listPatients() {
  return DEMO_PATIENTS;
}

export function listDoctors() {
  return DEMO_DOCTORS;
}

export function patientName(patientId: string) {
  return getPatientById(patientId)?.name ?? "Unknown patient";
}

export function doctorName(doctorId: string) {
  return getDoctorById(doctorId)?.name ?? DEMO_DOCTOR.name;
}

export function resetDemo() {
  resetDemoState();
}

export type { Medication };
