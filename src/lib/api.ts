import { CBC_REPORT_ID, countPipeline, createCbcFindings, needsDoctorReview } from "./cbcDemo";
import { buildKnowledgeGraph, compareSeries } from "./clinicalContext";
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
  answerQuestion,
  assertPublishable,
  rewriteFromStructure,
  toApprovedExplanation,
  translateApproved,
  translateApprovedKannada,
} from "./policy";
import {
  clearSession,
  getRegisteredAccounts,
  getSession,
  saveRegisteredAccount,
} from "./session";
import { getDemoState, patchDemoState, resetDemoState } from "./store";
import {
  AccessError,
  accessLevel,
  buildHandoffSummary,
  dataQuality,
  datedTrends,
  healthVault,
  nextShareToken,
  shareStatus,
  type Actor,
} from "./vault";
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
  FindingCard,
  MedicalReport,
  SourceLine,
  Medication,
  MedicationSafetyCheck,
  PatientExplanation,
  RejectReason,
  RewriteStyle,
  SafetyCheckInput,
  SafetyCheckResult,
  SessionUser,
  TriadicAuditEvent,
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
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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
  const token = getSession()?.token;
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      detail = "";
    }
    throw new Error(detail || `API error ${response.status}`);
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

export async function uploadDocument(file: File, patientId = "patient-arun"): Promise<MedicalReport> {
  if (process.env.NEXT_PUBLIC_API_MODE !== "live") {
    return uploadReport(file.name, patientId);
  }
  const body = new FormData();
  body.set("file", file);
  body.set("patientId", patientId);
  const token = getSession()?.token;
  const response = await fetch(`${API_BASE}/reports/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string") detail = payload.detail;
    } catch {
      detail = "";
    }
    throw new Error(detail || `API error ${response.status}`);
  }
  return response.json() as Promise<MedicalReport>;
}

export async function publishReportSummary(reportId: string) {
  return liveRequest(`/reports/${reportId}/summary/approve`, { method: "POST" });
}

export async function listAppointments() {
  if (!USE_MOCK) return liveRequest<Array<Record<string, string>>>("/appointments");
  return [];
}

export async function appointmentSlots(doctorId: string) {
  if (!USE_MOCK) return liveRequest<Array<Record<string, string>>>(`/appointments/slots?doctorId=${doctorId}`);
  return [];
}

export async function bookAppointment(input: { doctorId: string; specialty: string; appointmentDate: string; appointmentTime: string; reason: string }) {
  return liveRequest("/appointments", { method: "POST", body: JSON.stringify(input) });
}

export async function updateAppointment(id: string, status: string) {
  return liveRequest(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export async function listPatientMedications(patientId: string) {
  return liveRequest<Array<Record<string, string>>>(`/patients/${patientId}/medications`);
}

export async function createMedication(input: { patientId: string; name: string; dosage: string; frequency: string; instructions: string }) {
  return liveRequest<{ id: string }>("/medications", { method: "POST", body: JSON.stringify(input) });
}

export async function createReminder(medicationId: string, reminderTime: string) {
  return liveRequest(`/medications/${medicationId}/reminders`, {
    method: "POST",
    body: JSON.stringify({ reminderTime, frequency: "daily" }),
  });
}

export async function listMyMedications() {
  if (!USE_MOCK) return liveRequest<Array<Record<string, string>>>("/patients/me/medications");
  return [];
}

export async function listMyReminders() {
  if (!USE_MOCK) return liveRequest<Array<Record<string, string>>>("/patients/me/reminders");
  return [];
}

export async function markReminderTaken(id: string) {
  return liveRequest(`/reminders/${id}/taken`, { method: "POST" });
}

export async function getLanguage() {
  if (!USE_MOCK) return liveRequest<{ language: string }>("/patients/me/language");
  return { language: "en" };
}

export async function setLanguage(language: string) {
  return liveRequest("/patients/me/language", { method: "PATCH", body: JSON.stringify({ language }) });
}

export async function listMyRecommendations() {
  if (!USE_MOCK) return liveRequest<Array<{ id: string; text: string; recommended_specialty?: string }>>("/patients/me/recommendations");
  return [];
}

export async function createRecommendation(patientId: string, reason: string, recommendedSpecialty: string) {
  return liveRequest(`/patients/${patientId}/recommendations`, {
    method: "POST",
    body: JSON.stringify({ reason, recommendedSpecialty }),
  });
}

export async function getSourceLines(reportId: string): Promise<SourceLine[]> {
  if (!USE_MOCK) return liveRequest<SourceLine[]>(`/reports/${reportId}/source`);
  return getDemoState().sourceLines.filter((line) => line.report_id === reportId);
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

function findingsFor(reportId: string) {
  return getDemoState().findings.filter((finding) => finding.report_id === reportId);
}

function shortDoctor(name: string) {
  const cleaned = name.replace(/^Dr\.\s*/, "");
  return `Dr. ${cleaned.split(" ")[0] ?? cleaned}`;
}

function addTriadicEvent(event: Omit<TriadicAuditEvent, "id" | "timestamp"> & { timestamp?: string }) {
  const entry: TriadicAuditEvent = {
    ...event,
    id: id("tev"),
    timestamp: event.timestamp ?? nowIso(),
  };
  patchDemoState((state) => ({
    ...state,
    triadicEvents: [...state.triadicEvents, entry],
  }));
  return entry;
}

function publishExplanationOnce(reportId: string, doctor: string) {
  const already = getDemoState().triadicEvents.some(
    (event) => event.report_id === reportId && event.action === "Patient explanation published",
  );
  if (already) return;
  addTriadicEvent({
    report_id: reportId,
    actor: doctor,
    actor_kind: "doctor",
    action: "Patient visibility enabled",
    detail: "Doctor-approved wording is now available to the patient.",
  });
}

function applyDecision(
  findingId: string,
  patch: Pick<
    FindingCard,
    "doctor_decision" | "final_text" | "final_text_ta" | "final_text_kn" | "patient_visible" | "reject_reason"
  >,
) {
  const current = getDemoState().findings.find((finding) => finding.id === findingId);
  if (!current) throw new Error("Finding not found");
  const doctor = shortDoctor(DEMO_DOCTOR.name);
  const decidedAt = nowIso();
  patchDemoState((state) => ({
    ...state,
    findings: state.findings.map((finding) =>
      finding.id === findingId
        ? {
            ...finding,
            ...patch,
            ai_draft: finding.ai_draft,
            doctor_name: doctor,
            decided_at: decidedAt,
            updated_at: decidedAt,
          }
        : finding,
    ),
  }));
  if (patch.patient_visible) publishExplanationOnce(current.report_id, doctor);
  return getDemoState().findings.find((finding) => finding.id === findingId) as FindingCard;
}

export async function getSystemStatus() {
  await wait(80);
  if (!USE_MOCK) return liveRequest<import("./types").SystemHealth>("/system/status");
  return getDemoState().system;
}

export async function getDoctorDashboard() {
  await wait(180);
  if (!USE_MOCK) return liveRequest<import("./types").DoctorDashboardData>("/doctor/dashboard");
  const state = getDemoState();
  const queue = state.reports
    .filter((report) => state.findings.some((finding) => finding.report_id === report.id))
    .map((report) => {
      const rows = findingsFor(report.id);
      const pending = rows.filter(
        (finding) => needsDoctorReview(finding) && finding.doctor_decision === "pending",
      ).length;
      return {
        report_id: report.id,
        patient_name: getPatientById(report.patientId)?.name ?? "Synthetic patient",
        report_name: report.title,
        review_count: pending,
        status: pending > 0 ? "Needs doctor review" : "Doctor review recorded",
        uploaded_at: report.uploadedAt,
      };
    });
  const current = state.findings.filter((finding) => finding.report_id === "rpt-cbc");
  const scoped = countPipeline(current.length ? current : state.findings);
  return {
    greeting_name: shortDoctor(DEMO_DOCTOR.name),
    ...scoped,
    queue,
    attention: (current.length ? current : state.findings).filter(needsDoctorReview),
  };
}

export async function getFindings(reportId: string) {
  await wait(150);
  if (!USE_MOCK) return liveRequest<FindingCard[]>(`/reports/${reportId}/findings`);
  return findingsFor(reportId);
}

export async function acceptFinding(findingId: string) {
  await wait(280);
  if (!USE_MOCK) {
    return liveRequest<FindingCard>(`/findings/${findingId}/accept`, { method: "POST" });
  }
  const finding = getDemoState().findings.find((item) => item.id === findingId);
  if (!finding) throw new Error("Finding not found");
  const text = (finding.gemini_rewrite ?? finding.ai_draft ?? "").trim();
  assertPublishable(text, finding);
  const saved = applyDecision(findingId, {
    doctor_decision: "accepted",
    final_text: text,
    final_text_ta: translateApproved(text, finding),
    final_text_kn: translateApprovedKannada(text, finding),
    patient_visible: true,
    reject_reason: null,
  });
  addTriadicEvent({
    report_id: finding.report_id,
    finding_id: finding.id,
    actor: shortDoctor(DEMO_DOCTOR.name),
    actor_kind: "doctor",
    action: `${finding.test_name} accepted by ${shortDoctor(DEMO_DOCTOR.name)}`,
    detail: "Doctor accepted wording for the patient explanation. The AI draft was kept unchanged.",
  });
  return saved;
}

export async function editFinding(findingId: string, finalText: string) {
  await wait(280);
  if (!USE_MOCK) {
    return liveRequest<FindingCard>(`/findings/${findingId}/edit`, {
      method: "POST",
      body: JSON.stringify({ final_text: finalText }),
    });
  }
  const finding = getDemoState().findings.find((item) => item.id === findingId);
  if (!finding) throw new Error("Finding not found");
  assertPublishable(finalText, finding);
  const saved = applyDecision(findingId, {
    doctor_decision: "edited",
    final_text: finalText.trim(),
    final_text_ta: translateApproved(finalText.trim(), finding),
    final_text_kn: translateApprovedKannada(finalText.trim(), finding),
    patient_visible: true,
    reject_reason: null,
  });
  addTriadicEvent({
    report_id: finding.report_id,
    finding_id: finding.id,
    actor: shortDoctor(DEMO_DOCTOR.name),
    actor_kind: "doctor",
    action: "Doctor edited finding",
    detail: "Doctor replaced the draft with approved wording. The original AI draft is still stored.",
  });
  return saved;
}

export async function rejectFinding(findingId: string, reason: RejectReason, note?: string) {
  await wait(280);
  if (!USE_MOCK) {
    return liveRequest<FindingCard>(`/findings/${findingId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, note }),
    });
  }
  const finding = getDemoState().findings.find((item) => item.id === findingId);
  if (!finding) throw new Error("Finding not found");
  const saved = applyDecision(findingId, {
    doctor_decision: "rejected",
    final_text: null,
    final_text_ta: null,
    final_text_kn: null,
    patient_visible: false,
    reject_reason: note?.trim() ? `${reason}: ${note.trim()}` : reason,
  });
  addTriadicEvent({
    report_id: finding.report_id,
    finding_id: finding.id,
    actor: shortDoctor(DEMO_DOCTOR.name),
    actor_kind: "doctor",
    action: finding.jev.overclaim
      ? "AI overclaim rejected"
      : `${finding.test_name} rejected by ${shortDoctor(DEMO_DOCTOR.name)}`,
    detail: `Rejected by ${shortDoctor(DEMO_DOCTOR.name)}. Reason: ${reason.replaceAll("_", " ")}.`,
  });
  return saved;
}

export async function rewriteFinding(findingId: string, style: RewriteStyle) {
  await wait(700);
  if (!USE_MOCK) {
    return liveRequest<FindingCard>(`/ai/findings/${findingId}/rewrite`, {
      method: "POST",
      body: JSON.stringify({ style }),
    });
  }
  const system = getDemoState().system;
  if (!system.gemini) {
    throw new Error("AI assistance unavailable. Structured report data remains available.");
  }
  const finding = getDemoState().findings.find((item) => item.id === findingId);
  if (!finding) throw new Error("Finding not found");
  const rewrite = rewriteFromStructure(finding, style);
  patchDemoState((state) => ({
    ...state,
    findings: state.findings.map((item) =>
      item.id === findingId
        ? { ...item, gemini_rewrite: rewrite, updated_at: nowIso(), ai_draft: item.ai_draft }
        : item,
    ),
  }));
  addTriadicEvent({
    report_id: finding.report_id,
    finding_id: finding.id,
    actor: "Gemini",
    actor_kind: "ai",
    action: "Gemini rewrite drafted",
    detail: `${finding.test_name} rewrite (${style.replaceAll("_", " ")}) is waiting for the doctor.`,
  });
  return getDemoState().findings.find((item) => item.id === findingId) as FindingCard;
}

export async function getApprovedExplanation(reportId: string) {
  await wait(160);
  if (!USE_MOCK) return liveRequest<import("./types").ApprovedExplanation | null>(`/reports/${reportId}/approved`);
  const report = getDemoState().reports.find((item) => item.id === reportId);
  if (!report) return null;
  const doctor = getDoctorById(report.doctorId)?.name ?? DEMO_DOCTOR.name;
  return toApprovedExplanation(reportId, report.title, shortDoctor(doctor), getDemoState().findings);
}

export async function getTrends() {
  await wait(140);
  if (!USE_MOCK) return liveRequest<import("./types").TrendSeries[]>("/patient/trends");
  return getDemoState().trends;
}

export async function getTriadicAudit(reportId?: string) {
  await wait(120);
  if (!USE_MOCK) {
    const query = reportId ? `?reportId=${reportId}` : "";
    return liveRequest<TriadicAuditEvent[]>(`/audit${query}`);
  }
  const events = getDemoState().triadicEvents;
  return (reportId ? events.filter((event) => event.report_id === reportId) : events).slice().sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export async function askAboutReport(reportId: string, question: string) {
  await wait(420);
  if (!USE_MOCK) {
    return liveRequest<import("./types").AskResult>("/assistant/ask", {
      method: "POST",
      body: JSON.stringify({ reportId, question }),
    });
  }
  const explanation = await getApprovedExplanation(reportId);
  return answerQuestion(question, explanation, getDemoState().trends);
}

export async function getPatientPreview(reportId: string) {
  return getApprovedExplanation(reportId);
}

export async function getPatientHistory(patientId: string) {
  await wait(120);
  const state = getDemoState();
  return {
    visits: state.visits.filter((visit) => visit.patient_id === patientId),
    observations: state.observations.filter((item) => item.patient_id === patientId),
  };
}

export async function getPatientTimeline(patientId: string) {
  const history = await getPatientHistory(patientId);
  return history.visits
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((visit) => ({
      ...visit,
      observations: history.observations.filter((item) => item.visit_id === visit.id),
    }));
}

export async function getKnowledgeGraph(patientId: string) {
  await wait(100);
  const state = getDemoState();
  return buildKnowledgeGraph({
    patientId,
    patientName: getPatientById(patientId)?.name ?? "Synthetic patient",
    visits: state.visits,
    allergies: state.allergies,
    safety: state.safetyChecks,
  });
}

export async function getObservationCompare(patientId: string, testName: string) {
  await wait(80);
  const points = getDemoState()
    .observations.filter(
      (item) => item.patient_id === patientId && item.test_name.toLowerCase() === testName.toLowerCase(),
    )
    .map((item) => ({ date: item.date, value: item.value, file_name: item.file_name, source_page: item.source_page, source_line: item.source_line, source_text: item.source_text, report_id: item.report_id }));
  return { test_name: testName, points, comparison: compareSeries(points) };
}

export async function getMedicationSafety(patientId: string) {
  await wait(100);
  return getDemoState().safetyChecks.filter((item) => item.patient_id === patientId);
}

export async function reviewMedicationSafety(
  checkId: string,
  decision: "approved" | "rejected" | "reviewed",
) {
  await wait(200);
  const current = getDemoState().safetyChecks.find((item) => item.id === checkId);
  if (!current) throw new Error("Safety check not found");
  patchDemoState((state) => ({
    ...state,
    safetyChecks: state.safetyChecks.map((item) =>
      item.id === checkId
        ? {
            ...item,
            doctor_decision: decision,
            patient_visible: false,
            decided_at: nowIso(),
          }
        : item,
    ),
  }));
  addTriadicEvent({
    report_id: "safety",
    actor: shortDoctor(DEMO_DOCTOR.name),
    actor_kind: "doctor",
    action: "Doctor reviewed warning",
    detail: `${current.medication}: ${decision}. Prototype curated rule only. Not a prescribing decision.`,
  });
  return getDemoState().safetyChecks.find((item) => item.id === checkId);
}

export async function getHealth() {
  return getSystemStatus();
}

function requireActor(): Actor {
  const session = getSession();
  if (!session) throw new AccessError(401, "Sign in required");
  return { role: session.role, id: session.profileId, name: session.name };
}

export async function getHealthVault(patientId?: string) {
  if (!USE_MOCK) {
    const path = patientId ? `/patients/${patientId}/health-vault` : "/patients/me/health-vault";
    return liveRequest<Awaited<ReturnType<typeof healthVault>>>(path);
  }
  await wait(120);
  const actor = requireActor();
  const id = patientId ?? (actor.role === "patient" ? actor.id : "");
  if (!id) throw new AccessError(400, "Patient is required");
  return healthVault(getDemoState(), actor, id);
}

export async function getDataQuality(patientId: string) {
  if (!USE_MOCK) return liveRequest<import("./types").DataQualityReport>(`/patients/${patientId}/data-quality`);
  await wait(80);
  assertTreating(patientId);
  return dataQuality(getDemoState(), patientId);
}

function assertTreating(patientId: string) {
  const actor = requireActor();
  if (accessLevel(getDemoState(), actor, patientId) !== "treating" && accessLevel(getDemoState(), actor, patientId) !== "own") {
    if (accessLevel(getDemoState(), actor, patientId) === null) throw new AccessError(403, "Forbidden");
  }
  if (actor.role === "doctor" && accessLevel(getDemoState(), actor, patientId) !== "treating") {
    throw new AccessError(403, "Forbidden");
  }
}

export async function createShare(input: {
  doctorId: string;
  permissions: import("./types").SharePermission[];
  hours: number;
  purpose: string;
}) {
  if (!USE_MOCK) {
    return liveRequest<import("./types").RecordShare>("/sharing/create", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  const actor = requireActor();
  if (actor.role !== "patient") throw new AccessError(403, "Forbidden");
  const createdAt = nowIso();
  const share = {
    id: id("share"),
    patient_id: actor.id,
    shared_with_doctor_id: input.doctorId,
    access_token: nextShareToken(getDemoState().shares.map((item) => item.access_token)),
    permissions: input.permissions,
    expires_at: new Date(Date.now() + input.hours * 3600_000).toISOString(),
    purpose: input.purpose,
    status: "ACTIVE" as const,
    created_at: createdAt,
    revoked_at: null,
  };
  patchDemoState((state) => ({ ...state, shares: [share, ...state.shares] }));
  addTriadicEvent({
    report_id: "share",
    actor: actor.name,
    actor_kind: "doctor",
    action: "SHARE_CREATED",
    detail: `${actor.name} shared selected records. Code ${share.access_token}.`,
  });
  return share;
}

export async function accessSharedRecord(code: string) {
  if (!USE_MOCK) {
    return liveRequest<Awaited<ReturnType<typeof healthVault>>>("/sharing/access", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }
  const actor = requireActor();
  if (actor.role !== "doctor") throw new AccessError(403, "Forbidden");
  const share = getDemoState().shares.find((item) => item.access_token.toLowerCase() === code.trim().toLowerCase());
  if (!share || share.shared_with_doctor_id !== actor.id) throw new AccessError(403, "Forbidden");
  const status = shareStatus(share);
  if (status !== "ACTIVE") throw new AccessError(403, status === "REVOKED" ? "Access revoked" : "Access expired");
  addTriadicEvent({
    report_id: "share",
    actor: actor.name,
    actor_kind: "doctor",
    action: "SHARE_ACCESSED",
    detail: `${actor.name} opened shared record ${share.access_token}.`,
  });
  return healthVault(getDemoState(), actor, share.patient_id);
}

export async function revokeShare(shareId: string) {
  if (!USE_MOCK) {
    await liveRequest("/sharing/revoke", {
      method: "POST",
      body: JSON.stringify({ shareId }),
    });
    return;
  }
  const actor = requireActor();
  const share = getDemoState().shares.find((item) => item.id === shareId && item.patient_id === actor.id);
  if (!share || actor.role !== "patient") throw new AccessError(403, "Forbidden");
  patchDemoState((state) => ({
    ...state,
    shares: state.shares.map((item) =>
      item.id === shareId ? { ...item, status: "REVOKED" as const, revoked_at: nowIso() } : item,
    ),
  }));
  addTriadicEvent({
    report_id: "share",
    actor: actor.name,
    actor_kind: "doctor",
    action: "SHARE_REVOKED",
    detail: `${actor.name} revoked ${share.access_token}.`,
  });
}

export async function listShares() {
  if (!USE_MOCK) return liveRequest<import("./types").RecordShare[]>("/sharing/history");
  const actor = requireActor();
  if (actor.role !== "patient") throw new AccessError(403, "Forbidden");
  return getDemoState().shares.filter((item) => item.patient_id === actor.id);
}

export async function createHandoff(patientId: string, assignedTo: string, reason: string) {
  if (!USE_MOCK) {
    return liveRequest<import("./types").ClinicalHandoff>("/handoffs", {
      method: "POST",
      body: JSON.stringify({ patientId, assignedTo, reason }),
    });
  }
  const actor = requireActor();
  if (accessLevel(getDemoState(), actor, patientId) !== "treating") throw new AccessError(403, "Forbidden");
  const handoff = {
    id: id("hand"),
    patient_id: patientId,
    created_by: actor.id,
    assigned_to: assignedTo,
    reason,
    summary: buildHandoffSummary(getDemoState(), patientId),
    ai_summary: null,
    status: "open" as const,
    created_at: nowIso(),
    accepted_at: null,
    closed_at: null,
  };
  patchDemoState((state) => ({ ...state, handoffs: [handoff, ...state.handoffs] }));
  addTriadicEvent({
    report_id: "handoff",
    actor: actor.name,
    actor_kind: "doctor",
    action: "HANDOFF_CREATED",
    detail: `Handoff created for ${reason}.`,
  });
  return handoff;
}

export async function addHandoffAiSummary(handoffId: string) {
  if (!USE_MOCK) {
    return liveRequest<import("./types").ClinicalHandoff>(`/handoffs/${handoffId}/summary`, { method: "POST" });
  }
  const actor = requireActor();
  const current = getDemoState().handoffs.find((item) => item.id === handoffId);
  if (!current || accessLevel(getDemoState(), actor, current.patient_id) !== "treating") {
    throw new AccessError(403, "Forbidden");
  }
  if (!getDemoState().system.gemini) {
    throw new Error("AI assistance unavailable. Structured report data remains available.");
  }
  const aiSummary = `AI-assisted summary of approved records only. ${current.summary}`;
  patchDemoState((state) => ({
    ...state,
    handoffs: state.handoffs.map((item) => (item.id === handoffId ? { ...item, ai_summary: aiSummary } : item)),
  }));
  return getDemoState().handoffs.find((item) => item.id === handoffId);
}

export async function listHandoffs() {
  if (!USE_MOCK) return liveRequest<import("./types").ClinicalHandoff[]>("/handoffs");
  const actor = requireActor();
  return getDemoState().handoffs.filter(
    (item) => item.created_by === actor.id || item.assigned_to === actor.id,
  );
}

export async function acceptHandoff(handoffId: string) {
  if (!USE_MOCK) {
    await liveRequest(`/handoffs/${handoffId}/accept`, { method: "POST" });
    return;
  }
  const actor = requireActor();
  const current = getDemoState().handoffs.find((item) => item.id === handoffId && item.assigned_to === actor.id);
  if (!current) throw new AccessError(403, "Forbidden");
  patchDemoState((state) => ({
    ...state,
    handoffs: state.handoffs.map((item) =>
      item.id === handoffId ? { ...item, status: "accepted" as const, accepted_at: nowIso() } : item,
    ),
  }));
  addTriadicEvent({
    report_id: "handoff",
    actor: actor.name,
    actor_kind: "doctor",
    action: "HANDOFF_ACCEPTED",
    detail: `${actor.name} accepted the handoff.`,
  });
}

export async function getPatientDirectory() {
  if (!USE_MOCK) {
    return liveRequest<
      Array<{
        id: string;
        name: string;
        mrn: string;
        last_visit: string | null;
        reports: number;
        pending_review: number;
        trend: string;
        access: string;
      }>
    >("/doctor/patients");
  }
  const actor = requireActor();
  if (actor.role !== "doctor") throw new AccessError(403, "Forbidden");
  const state = getDemoState();
  return DEMO_PATIENTS.map((patient) => {
    const level = accessLevel(state, actor, patient.id);
    const visits = state.visits.filter((item) => item.patient_id === patient.id);
    const pending = state.findings.filter(
      (item) =>
        state.reports.some((report) => report.id === item.report_id && report.patientId === patient.id) &&
        (item.jev.triage === "review_needed" || item.jev.triage === "insufficient") &&
        item.doctor_decision === "pending",
    ).length;
    const hb = datedTrends(state, patient.id).find((item) => item.metric === "Hemoglobin");
    return {
      id: patient.id,
      name: patient.name,
      mrn: patient.mrn,
      last_visit: visits.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date ?? null,
      reports: state.reports.filter((report) => report.patientId === patient.id).length,
      pending_review: level === "treating" ? pending : 0,
      trend: hb && hb.delta < 0 ? "Hb down" : hb ? "Hb recorded" : "No trend",
      access: level ?? "none",
    };
  });
}

export { datedTrends, dataQuality, AccessError };

export async function loadCbcDemo() {
  const existing = getDemoState().reports.find((report) => report.id === CBC_REPORT_ID);
  if (!existing || findingsFor(CBC_REPORT_ID).length === 0) {
    const seed = createSeedState();
    patchDemoState((state) => ({
      ...state,
      reports: [seed.reports[0], ...state.reports.filter((report) => report.id !== CBC_REPORT_ID)],
      findings: [
        ...state.findings.filter((finding) => finding.report_id !== CBC_REPORT_ID),
        ...createCbcFindings(),
      ],
      sourceLines: [
        ...state.sourceLines.filter((line) => line.report_id !== CBC_REPORT_ID),
        ...seed.sourceLines,
      ],
    }));
  }
  return (await getReport(CBC_REPORT_ID)) as MedicalReport;
}

export type { Medication };
