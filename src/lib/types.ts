export type UserRole = "doctor" | "patient";

export type ProcessingStatus =
  | "processing"
  | "analysis_ready"
  | "reviewed"
  | "needs_review"
  | "failed";

export type DoctorReviewStatus =
  | "pending"
  | "accepted"
  | "modified"
  | "rejected";

export type EvidenceStrength = "limited" | "moderate" | "strong";

export type SafetyFlagStatus =
  | "no_issue"
  | "review_recommended"
  | "information_missing";

export type NotificationTone = "success" | "info" | "warning";

export type AuditAction =
  | "report_uploaded"
  | "ai_analysis_generated"
  | "ai_finding_created"
  | "ai_analysis_failed"
  | "doctor_reviewed"
  | "doctor_accepted"
  | "doctor_modified"
  | "doctor_rejected"
  | "patient_explanation_generated"
  | "patient_viewed_explanation"
  | "safety_check_run"
  | "medication_check_performed"
  | "medication_decision_recorded";

export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  email: string;
  initials: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: "Male" | "Female";
  email: string;
  mrn: string;
  allergies: string[];
  currentMedications: Medication[];
}

export interface LabValue {
  label: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: "normal" | "attention";
}

export interface PatientExplanation {
  summary: string;
  whatWasChecked: string;
  whatWasFound: string;
  whatDoctorReviewed: string;
  whatToDiscuss: string;
  voiceScript: string;
}

export interface MedicalReport {
  id: string;
  patientId: string;
  doctorId: string;
  title: string;
  type: string;
  uploadedAt: string;
  processingStatus: ProcessingStatus;
  doctorReviewStatus: DoctorReviewStatus;
  labValues: LabValue[];
  notes: string;
  isSynthetic: boolean;
}

export interface AIInsight {
  id: string;
  reportId: string;
  title: string;
  finding: string;
  consideration: string;
  evidence: string;
  evidenceStrength: EvidenceStrength;
  supportingInformation: string[];
  missingInformation: string[];
  recommendedReview: string;
  reviewRecommended: boolean;
}

export interface DoctorReview {
  id: string;
  reportId: string;
  insightId: string;
  doctorId: string;
  status: DoctorReviewStatus;
  decisionNote: string;
  editedFinding?: string;
  recordedAt: string;
}

export interface AuditLog {
  id: string;
  reportId: string;
  actor: string;
  action: AuditAction;
  detail: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  audience: UserRole;
  patientId?: string;
  title: string;
  body: string;
  tone: NotificationTone;
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  reportId?: string;
}

export interface HealthTrendPoint {
  date: string;
  value: number;
  unit: string;
  referenceRange: string;
}

export interface HealthTrend {
  metric: string;
  unit: string;
  referenceRange: string;
  points: HealthTrendPoint[];
}

export interface MedicationSafetyCheck {
  interaction: {
    status: SafetyFlagStatus;
    summary: string;
    evidence: string;
  };
  allergy: {
    status: SafetyFlagStatus;
    summary: string;
    evidence: string;
  };
  information: {
    status: SafetyFlagStatus;
    summary: string;
    evidence: string;
  };
}

export interface DashboardStats {
  patientsToday: number;
  reportsAwaitingReview: number;
  aiInsights: number;
  pendingDecisions: number;
}

export interface SafetyCheckInput {
  patientId: string;
  medications: Medication[];
}

export interface SafetyCheckResult {
  check: MedicationSafetyCheck;
  potentialInteraction: string;
  allergyCheck: string;
  status: string;
}

export interface SessionUser {
  role: UserRole;
  email: string;
  name: string;
  profileId: string;
  title?: string;
}

export interface RegisteredAccount {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface DemoState {
  reports: MedicalReport[];
  insights: AIInsight[];
  reviews: DoctorReview[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
}

export function isDoctorReviewed(status: DoctorReviewStatus) {
  return status === "accepted" || status === "modified";
}
