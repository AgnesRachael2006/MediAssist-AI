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
  fileName?: string;
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

export type JevTriage = "routine_normal" | "review_needed" | "insufficient";
export type JevEvidence = "strong" | "moderate" | "limited" | "insufficient";
export type JevReasonCode =
  | "OUTSIDE_REFERENCE_RANGE"
  | "MISSING_SOURCE"
  | "MISSING_REFERENCE_RANGE"
  | "MISSING_VALUE"
  | "POSSIBLE_OVERCLAIM"
  | "INSUFFICIENT_CONTEXT"
  | "TREND_CHANGE"
  | "ROUTINE_NORMAL";
export type AuditActorKind = "ai" | "jev" | "system" | "doctor";
export type SafetyStatus = "clear" | "warning" | "requires_review";
export type FindingDecision = "pending" | "accepted" | "edited" | "rejected";
export type RewriteStyle = "patient_friendly" | "concise" | "formal";
export type RejectReason =
  | "overclaim"
  | "insufficient_evidence"
  | "incorrect_interpretation"
  | "not_clinically_relevant"
  | "duplicate"
  | "incorrect_extraction"
  | "not_clinically_appropriate"
  | "other";
export type QuestionClass =
  | "explain_term"
  | "explain_value"
  | "compare_history"
  | "explain_approved_content"
  | "diagnosis_request"
  | "medication_dose"
  | "treatment_request"
  | "emergency_decision"
  | "unsupported_question";

export interface FindingSource {
  page: number;
  line_start: number;
  line_end: number;
  excerpt: string;
}

export interface FindingChecks {
  source_found: boolean;
  value_extracted: boolean;
  reference_available: boolean;
  outside_range: boolean;
  previous_available: boolean;
}

export interface FindingCard {
  id: string;
  report_id: string;
  test_name: string;
  value: number | string;
  unit: string;
  reference_range: string;
  source: FindingSource;
  jev: {
    triage: JevTriage;
    evidence: JevEvidence;
    overclaim: boolean;
    reason_codes: JevReasonCode[];
  };
  overclaim_detail: {
    available: string[];
    missing: string[];
  } | null;
  teach: {
    bullets: string[];
  };
  checks: FindingChecks;
  previous_value: number | null;
  previous_unit: string | null;
  ai_draft: string | null;
  gemini_rewrite: string | null;
  doctor_decision: FindingDecision;
  final_text: string | null;
  final_text_ta: string | null;
  patient_visible: boolean;
  doctor_name: string | null;
  decided_at: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceLine {
  report_id: string;
  page: number;
  line: number;
  text: string;
}

export interface TriadicAuditEvent {
  id: string;
  report_id: string;
  finding_id?: string;
  timestamp: string;
  actor: string;
  actor_kind: AuditActorKind;
  action: string;
  detail: string;
}

export interface SystemHealth {
  pdf: boolean;
  gemini: boolean;
  jev: boolean;
  database: boolean;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface TrendSeries {
  metric: string;
  unit: string;
  points: TrendPoint[];
}

export interface ApprovedStatement {
  test_name: string;
  text: string;
  text_ta: string;
}

export interface ApprovedExplanation {
  report_id: string;
  title: string;
  doctor_name: string;
  reviewed_at: string | null;
  notice: string;
  notice_ta: string;
  what_was_checked: string;
  what_was_checked_ta: string;
  results: ApprovedStatement[];
  what_was_missing: string;
  what_was_missing_ta: string;
  discuss: string;
  discuss_ta: string;
  voice_script: string;
  voice_script_ta: string;
}

export interface AskResult {
  classification: QuestionClass;
  allowed: boolean;
  status_label: string;
  answer: string;
}

export interface DoctorQueueRow {
  report_id: string;
  patient_name: string;
  report_name: string;
  review_count: number;
  status: string;
  uploaded_at: string;
}

export interface DoctorDashboardData {
  greeting_name: string;
  rows_extracted: number;
  review_needed: number;
  routine_normal: number;
  insufficient: number;
  approved: number;
  rejected: number;
  pending: number;
  patient_visible: number;
  queue: DoctorQueueRow[];
  attention: FindingCard[];
}

export interface ClinicalVisit {
  id: string;
  patient_id: string;
  date: string;
  label: string;
  report_id: string;
  file_name: string;
  summary: string;
}

export interface ClinicalObservation {
  id: string;
  patient_id: string;
  visit_id: string;
  report_id: string;
  test_name: string;
  value: number;
  unit: string;
  date: string;
  file_name: string;
  source_page: number;
  source_line: number;
  source_text: string;
}

export interface AllergyRecord {
  id: string;
  patient_id: string;
  substance: string;
  source: string;
}

export interface MedicationSafetyRow {
  id: string;
  patient_id: string;
  medication: string;
  allergy: string;
  interaction: string;
  evidence: string;
  status: SafetyStatus;
  doctor_decision: "pending" | "reviewed" | "approved" | "rejected";
  why: string[];
  patient_visible: boolean;
  decided_at: string | null;
}

export interface GraphNode {
  id: string;
  patient_id: string;
  node_type: "PATIENT" | "VISIT" | "REPORT" | "FINDING" | "MEDICATION" | "ALLERGY" | "TREND";
  entity_id: string;
  label: string;
}

export interface GraphEdge {
  id: string;
  patient_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship: string;
}

export interface DemoState {
  reports: MedicalReport[];
  insights: AIInsight[];
  reviews: DoctorReview[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  findings: FindingCard[];
  sourceLines: SourceLine[];
  triadicEvents: TriadicAuditEvent[];
  trends: TrendSeries[];
  visits: ClinicalVisit[];
  observations: ClinicalObservation[];
  allergies: AllergyRecord[];
  safetyChecks: MedicationSafetyRow[];
  system: SystemHealth;
}

export function isDoctorReviewed(status: DoctorReviewStatus) {
  return status === "accepted" || status === "modified";
}
