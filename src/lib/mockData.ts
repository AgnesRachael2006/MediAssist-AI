import type {
  AIInsight,
  AppNotification,
  AuditLog,
  ChatMessage,
  DemoState,
  Doctor,
  DoctorReview,
  MedicalReport,
  Patient,
  PatientExplanation,
} from "./types";

export const DEMO_DOCTORS: Doctor[] = [
  {
    id: "doctor-1",
    name: "Dr. Sarah Wilson",
    title: "General Physician",
    specialty: "General Medicine",
    email: "sarah.wilson@mediassist.demo",
    initials: "SW",
  },
  {
    id: "doctor-2",
    name: "Dr. Priya Nair",
    title: "Internal Medicine",
    specialty: "Internal Medicine",
    email: "priya.nair@mediassist.demo",
    initials: "PN",
  },
];

export const DEMO_DOCTOR = DEMO_DOCTORS[0];

export const DEMO_PATIENTS: Patient[] = [
  {
    id: "patient-arun",
    name: "Arun Kumar",
    age: 34,
    sex: "Male",
    email: "arun.kumar@mediassist.demo",
    mrn: "MRN-10428",
    allergies: ["None recorded"],
    currentMedications: [
      {
        id: "med-arun-1",
        name: "Paracetamol",
        dosage: "500 mg",
        frequency: "As needed for fever",
      },
    ],
  },
  {
    id: "patient-meera",
    name: "Meera Sharma",
    age: 29,
    sex: "Female",
    email: "meera.sharma@mediassist.demo",
    mrn: "MRN-11073",
    allergies: ["Penicillin"],
    currentMedications: [
      {
        id: "med-meera-1",
        name: "Cetirizine",
        dosage: "10 mg",
        frequency: "Once daily",
      },
    ],
  },
  {
    id: "patient-rohan",
    name: "Rohan Iyer",
    age: 41,
    sex: "Male",
    email: "rohan.iyer@mediassist.demo",
    mrn: "MRN-09812",
    allergies: ["NSAID sensitivity (recorded)"],
    currentMedications: [],
  },
];

export const LOGGED_IN_PATIENT_ID = "patient-arun";

const arunCbcSept: MedicalReport["labValues"] = [
  { label: "Hemoglobin", value: "12.8", unit: "g/dL", referenceRange: "13.0 – 17.0", flag: "attention" },
  { label: "WBC", value: "8,400", unit: "/µL", referenceRange: "4,000 – 11,000", flag: "normal" },
  { label: "Platelets", value: "145,000", unit: "/µL", referenceRange: "150,000 – 450,000", flag: "attention" },
  { label: "Glucose", value: "102", unit: "mg/dL", referenceRange: "70 – 99", flag: "attention" },
  { label: "Temperature", value: "38.2", unit: "°C", referenceRange: "36.1 – 37.2", flag: "attention" },
];

const reports: MedicalReport[] = [
  {
    id: "rpt-001",
    patientId: "patient-arun",
    doctorId: "doctor-1",
    title: "Complete Blood Count",
    type: "CBC",
    uploadedAt: "2026-09-22T09:12:00+05:30",
    processingStatus: "analysis_ready",
    doctorReviewStatus: "pending",
    isSynthetic: true,
    notes: "Synthetic outpatient panel for hackathon demonstration only.",
    labValues: arunCbcSept,
  },
  {
    id: "rpt-004",
    patientId: "patient-arun",
    doctorId: "doctor-1",
    title: "Complete Blood Count",
    type: "CBC",
    uploadedAt: "2026-06-15T10:20:00+05:30",
    processingStatus: "reviewed",
    doctorReviewStatus: "accepted",
    isSynthetic: true,
    notes: "Synthetic historical CBC for trend comparison.",
    labValues: [
      { label: "Hemoglobin", value: "13.1", unit: "g/dL", referenceRange: "13.0 – 17.0", flag: "normal" },
      { label: "WBC", value: "8,100", unit: "/µL", referenceRange: "4,000 – 11,000", flag: "normal" },
      { label: "Platelets", value: "178,000", unit: "/µL", referenceRange: "150,000 – 450,000", flag: "normal" },
      { label: "Glucose", value: "98", unit: "mg/dL", referenceRange: "70 – 99", flag: "normal" },
      { label: "Temperature", value: "36.9", unit: "°C", referenceRange: "36.1 – 37.2", flag: "normal" },
    ],
  },
  {
    id: "rpt-005",
    patientId: "patient-arun",
    doctorId: "doctor-1",
    title: "Complete Blood Count",
    type: "CBC",
    uploadedAt: "2026-03-10T11:05:00+05:30",
    processingStatus: "reviewed",
    doctorReviewStatus: "accepted",
    isSynthetic: true,
    notes: "Synthetic historical CBC for trend comparison.",
    labValues: [
      { label: "Hemoglobin", value: "13.4", unit: "g/dL", referenceRange: "13.0 – 17.0", flag: "normal" },
      { label: "WBC", value: "7,200", unit: "/µL", referenceRange: "4,000 – 11,000", flag: "normal" },
      { label: "Platelets", value: "210,000", unit: "/µL", referenceRange: "150,000 – 450,000", flag: "normal" },
      { label: "Glucose", value: "94", unit: "mg/dL", referenceRange: "70 – 99", flag: "normal" },
      { label: "Temperature", value: "36.8", unit: "°C", referenceRange: "36.1 – 37.2", flag: "normal" },
    ],
  },
  {
    id: "rpt-002",
    patientId: "patient-meera",
    doctorId: "doctor-1",
    title: "Blood Test",
    type: "Metabolic panel",
    uploadedAt: "2026-09-21T16:40:00+05:30",
    processingStatus: "reviewed",
    doctorReviewStatus: "accepted",
    isSynthetic: true,
    notes: "Synthetic fasting sample for demonstration.",
    labValues: [
      { label: "Fasting glucose", value: "126", unit: "mg/dL", referenceRange: "70 – 99", flag: "attention" },
      { label: "Hemoglobin", value: "13.1", unit: "g/dL", referenceRange: "12.0 – 15.0", flag: "normal" },
    ],
  },
  {
    id: "rpt-003",
    patientId: "patient-rohan",
    doctorId: "doctor-2",
    title: "Outpatient Labs",
    type: "Labs",
    uploadedAt: "2026-09-20T11:05:00+05:30",
    processingStatus: "needs_review",
    doctorReviewStatus: "pending",
    isSynthetic: true,
    notes: "Incomplete clinical history attached.",
    labValues: [
      { label: "Creatinine", value: "1.1", unit: "mg/dL", referenceRange: "0.7 – 1.3", flag: "normal" },
    ],
  },
];

const insights: AIInsight[] = [
  {
    id: "ins-001",
    reportId: "rpt-001",
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
  },
  {
    id: "ins-002",
    reportId: "rpt-002",
    title: "Glucose above listed interval",
    finding:
      "Fasting glucose is above the provided laboratory reference interval.",
    consideration: "Possible consideration requiring clinical review.",
    evidence: "Blood test values",
    evidenceStrength: "strong",
    supportingInformation: ["Fasting glucose 126 mg/dL"],
    missingInformation: ["Prior glucose results", "Symptom history"],
    recommendedReview:
      "Review glucose result in the context of history and prior labs.",
    reviewRecommended: true,
  },
  {
    id: "ins-003",
    reportId: "rpt-003",
    title: "Missing information detected",
    finding:
      "The uploaded packet does not include enough history to support a complete clinical summary.",
    consideration: "Possible consideration requiring clinical review.",
    evidence: "Incomplete report packet",
    evidenceStrength: "limited",
    supportingInformation: ["Creatinine within provided range"],
    missingInformation: ["Indication for testing", "Current medications"],
    recommendedReview: "Request missing clinical context before acting on AI output.",
    reviewRecommended: true,
  },
  {
    id: "ins-004",
    reportId: "rpt-004",
    title: "Values within provided ranges",
    finding: "Listed CBC values were within the laboratory ranges provided with this report.",
    consideration: "Historical comparison only.",
    evidence: "CBC report",
    evidenceStrength: "moderate",
    supportingInformation: ["Hemoglobin 13.1 g/dL", "Platelets 178,000 /µL"],
    missingInformation: ["Clinical indication"],
    recommendedReview: "No urgent flags in demo data; clinician may still correlate with history.",
    reviewRecommended: false,
  },
  {
    id: "ins-005",
    reportId: "rpt-005",
    title: "Values within provided ranges",
    finding: "Listed CBC values were within the laboratory ranges provided with this report.",
    consideration: "Historical comparison only.",
    evidence: "CBC report",
    evidenceStrength: "moderate",
    supportingInformation: ["Hemoglobin 13.4 g/dL", "Platelets 210,000 /µL"],
    missingInformation: ["Clinical indication"],
    recommendedReview: "Use as a baseline for later comparison.",
    reviewRecommended: false,
  },
];

const reviews: DoctorReview[] = [
  {
    id: "rev-002",
    reportId: "rpt-002",
    insightId: "ins-002",
    doctorId: "doctor-1",
    status: "accepted",
    decisionNote:
      "Glucose elevation noted. Will correlate with history during follow-up.",
    recordedAt: "2026-09-21T17:10:00+05:30",
  },
  {
    id: "rev-004",
    reportId: "rpt-004",
    insightId: "ins-004",
    doctorId: "doctor-1",
    status: "accepted",
    decisionNote: "Historical panel reviewed. Suitable for comparison.",
    recordedAt: "2026-06-15T11:00:00+05:30",
  },
  {
    id: "rev-005",
    reportId: "rpt-005",
    insightId: "ins-005",
    doctorId: "doctor-1",
    status: "accepted",
    decisionNote: "Baseline panel reviewed.",
    recordedAt: "2026-03-10T12:00:00+05:30",
  },
];

const auditLogs: AuditLog[] = [
  {
    id: "aud-001",
    reportId: "rpt-001",
    actor: "System",
    action: "report_uploaded",
    detail: "Synthetic CBC uploaded for Arun Kumar.",
    timestamp: "2026-09-22T09:12:00+05:30",
  },
  {
    id: "aud-002",
    reportId: "rpt-001",
    actor: "MediAssist AI",
    action: "ai_analysis_generated",
    detail: "AI analysis completed for CBC.",
    timestamp: "2026-09-22T09:14:00+05:30",
  },
  {
    id: "aud-002b",
    reportId: "rpt-001",
    actor: "MediAssist AI",
    action: "ai_finding_created",
    detail: "AI finding created for clinician review.",
    timestamp: "2026-09-22T09:14:20+05:30",
  },
  {
    id: "aud-003",
    reportId: "rpt-002",
    actor: "System",
    action: "report_uploaded",
    detail: "Synthetic blood test uploaded for Meera Sharma.",
    timestamp: "2026-09-21T16:40:00+05:30",
  },
  {
    id: "aud-004",
    reportId: "rpt-002",
    actor: "MediAssist AI",
    action: "ai_analysis_generated",
    detail: "AI clinical insight generated for blood test.",
    timestamp: "2026-09-21T16:42:00+05:30",
  },
  {
    id: "aud-005",
    reportId: "rpt-002",
    actor: "Dr. Sarah Wilson",
    action: "doctor_reviewed",
    detail: "Doctor reviewed AI finding.",
    timestamp: "2026-09-21T17:08:00+05:30",
  },
  {
    id: "aud-006",
    reportId: "rpt-002",
    actor: "Dr. Sarah Wilson",
    action: "doctor_accepted",
    detail: "Doctor accepted AI insight.",
    timestamp: "2026-09-21T17:10:00+05:30",
  },
  {
    id: "aud-007",
    reportId: "rpt-002",
    actor: "MediAssist AI",
    action: "patient_explanation_generated",
    detail: "Patient-friendly explanation generated after approval.",
    timestamp: "2026-09-21T17:11:00+05:30",
  },
  {
    id: "aud-008",
    reportId: "rpt-004",
    actor: "System",
    action: "report_uploaded",
    detail: "Historical synthetic CBC uploaded for Arun Kumar.",
    timestamp: "2026-06-15T10:20:00+05:30",
  },
  {
    id: "aud-009",
    reportId: "rpt-004",
    actor: "MediAssist AI",
    action: "ai_analysis_generated",
    detail: "AI analysis completed.",
    timestamp: "2026-06-15T10:22:00+05:30",
  },
  {
    id: "aud-010",
    reportId: "rpt-004",
    actor: "Dr. Sarah Wilson",
    action: "doctor_accepted",
    detail: "Doctor accepted historical CBC insight.",
    timestamp: "2026-06-15T11:00:00+05:30",
  },
  {
    id: "aud-011",
    reportId: "rpt-004",
    actor: "MediAssist AI",
    action: "patient_explanation_generated",
    detail: "Patient explanation generated.",
    timestamp: "2026-06-15T11:01:00+05:30",
  },
  {
    id: "aud-012",
    reportId: "rpt-005",
    actor: "System",
    action: "report_uploaded",
    detail: "Baseline synthetic CBC uploaded for Arun Kumar.",
    timestamp: "2026-03-10T11:05:00+05:30",
  },
  {
    id: "aud-013",
    reportId: "rpt-005",
    actor: "Dr. Sarah Wilson",
    action: "doctor_accepted",
    detail: "Doctor accepted baseline CBC.",
    timestamp: "2026-03-10T12:00:00+05:30",
  },
  {
    id: "aud-014",
    reportId: "rpt-005",
    actor: "MediAssist AI",
    action: "patient_explanation_generated",
    detail: "Patient explanation generated.",
    timestamp: "2026-03-10T12:01:00+05:30",
  },
];

const notifications: AppNotification[] = [
  {
    id: "ntf-001",
    audience: "patient",
    patientId: "patient-arun",
    title: "A new report was uploaded.",
    body: "Complete Blood Count (22 Sep 2026) is waiting for doctor review.",
    tone: "info",
    createdAt: "2026-09-22T09:12:00+05:30",
    read: false,
    href: "/patient/reports",
  },
  {
    id: "ntf-002",
    audience: "patient",
    patientId: "patient-arun",
    title: "Your patient-friendly explanation is ready.",
    body: "June Complete Blood Count explanation is available to read and listen to.",
    tone: "success",
    createdAt: "2026-06-15T11:01:00+05:30",
    read: false,
    href: "/patient/reports/rpt-004",
  },
  {
    id: "ntf-003",
    audience: "patient",
    patientId: "patient-arun",
    title: "Your report has been reviewed by Dr. Wilson.",
    body: "June Complete Blood Count was reviewed. Only approved information is shown.",
    tone: "success",
    createdAt: "2026-06-15T11:00:00+05:30",
    read: true,
    href: "/patient/doctor-reviews",
  },
  {
    id: "ntf-004",
    audience: "doctor",
    title: "Report awaiting review",
    body: "Arun Kumar — Complete Blood Count is ready for AI ↔ Doctor Cross-Check.",
    tone: "warning",
    createdAt: "2026-09-22T09:14:00+05:30",
    read: false,
    href: "/doctor/reports/rpt-001",
  },
];

export const SEED_CHAT: ChatMessage[] = [
  {
    id: "chat-1",
    role: "user",
    content: "What does platelet count mean?",
    createdAt: "2026-09-22T10:00:00+05:30",
    reportId: "rpt-004",
  },
  {
    id: "chat-2",
    role: "assistant",
    content:
      "Platelet count is a laboratory measurement of cell fragments that help blood clot. Your report lists a number and a reference range provided by the lab. This explanation is educational only — your doctor interprets what it means for you.",
    createdAt: "2026-09-22T10:00:08+05:30",
    reportId: "rpt-004",
  },
];

const voiceCbc =
  "Here is a simple explanation of your report. Your doctor has reviewed this information. " +
  "The tests performed were a complete blood count, including hemoglobin, white blood cells, platelets, glucose, and a recorded temperature. " +
  "Hemoglobin is a protein in red blood cells that carries oxygen. White blood cells are part of the body's usual defense system. Platelets help blood clot. Glucose is a blood sugar measurement. Temperature is a vital sign recorded with the panel. " +
  "Some values sit within the laboratory reference range printed on the report. " +
  "Some values sit outside or near the edge of that provided range. Near-range or outside-range numbers are observations, not a diagnosis. " +
  "Important observations on this synthetic report are noted for discussion, including values close to a listed bound and a recorded temperature above the typical range shown. " +
  "Missing information may include previous results and how long symptoms have lasted. " +
  "Your doctor reviewed the original numbers, the AI clinical insight, and the missing-information notes. " +
  "You can discuss how you have been feeling, how long any fever has lasted, and whether older blood tests are available. " +
  "MediAssist does not diagnose conditions. Discuss this finding with your doctor.";

export const PATIENT_EXPLANATIONS: Record<string, PatientExplanation> = {
  "rpt-001": {
    summary:
      "Your report shows a complete blood count. Platelet count is near the lower end of the provided reference range. Your doctor may consider your symptoms and previous reports when reviewing this result. This is not a diagnosis.",
    whatWasChecked:
      "This report looked at hemoglobin, white blood cells, platelets, glucose, and recorded temperature.",
    whatWasFound:
      "White blood cells are within the provided reference range. Hemoglobin, platelets, and glucose are outside or near the listed range, and a temperature above the listed range was recorded. The report indicates these observations only. This is not a diagnosis.",
    whatDoctorReviewed:
      "Your doctor reviewed the AI clinical insight, the original lab values, and the missing information notes before approving this explanation.",
    whatToDiscuss:
      "You may wish to discuss how you have been feeling, how long any fever has lasted, and whether previous blood tests are available.",
    voiceScript: voiceCbc,
  },
  "rpt-002": {
    summary:
      "Your blood test included a glucose result that was above the laboratory range provided with the report. Your doctor reviewed this finding and approved this simple explanation.",
    whatWasChecked: "This report included fasting glucose and hemoglobin.",
    whatWasFound:
      "Glucose was higher than the listed reference interval. Hemoglobin was within the listed range. This is not a diagnosis.",
    whatDoctorReviewed:
      "Your doctor accepted the AI clinical insight and will correlate it with your history.",
    whatToDiscuss:
      "You may wish to ask what this glucose result means for you and whether any further tests are being considered.",
    voiceScript:
      "Here is a simple explanation of your report. Your doctor has reviewed this information. " +
      "The tests included fasting glucose and hemoglobin. Glucose was above the listed laboratory interval. Hemoglobin was within the listed range. " +
      "Your doctor reviewed this finding. Discuss this result with your doctor. This is not a diagnosis.",
  },
  "rpt-004": {
    summary:
      "This earlier complete blood count was reviewed by your doctor. The listed values were within the laboratory ranges provided with the report.",
    whatWasChecked: "Hemoglobin, white blood cells, platelets, glucose, and temperature.",
    whatWasFound:
      "The listed values were within the provided reference ranges. Your previous results are shown for comparison only.",
    whatDoctorReviewed: "Dr. Sarah Wilson accepted the insight for this historical panel.",
    whatToDiscuss: "You can ask how this older report compares with newer results.",
    voiceScript:
      "Here is a simple explanation of your June complete blood count. Your doctor has reviewed this information. " +
      "The listed values were within the laboratory ranges provided with the report. " +
      "Your previous results are shown for comparison. This is not a diagnosis. Discuss any questions with your doctor.",
  },
  "rpt-005": {
    summary:
      "This earlier complete blood count was reviewed by your doctor and can be used as a comparison point.",
    whatWasChecked: "Hemoglobin, white blood cells, platelets, glucose, and temperature.",
    whatWasFound: "The listed values were within the provided reference ranges.",
    whatDoctorReviewed: "Dr. Sarah Wilson accepted this baseline panel.",
    whatToDiscuss: "You can ask how later results compare with this baseline.",
    voiceScript:
      "Here is a simple explanation of your March complete blood count. Your doctor has reviewed this information. " +
      "The listed values were within the laboratory ranges provided with the report. Discuss any questions with your doctor.",
  },
};

export function buildPatientExplanation(
  report: MedicalReport,
  review: DoctorReview | null,
): PatientExplanation {
  const curated = PATIENT_EXPLANATIONS[report.id];
  if (curated && review?.status !== "modified") return curated;

  const within = report.labValues.filter((lab) => lab.flag === "normal");
  const attention = report.labValues.filter((lab) => lab.flag === "attention");
  const checked = report.labValues.map((lab) => lab.label.toLowerCase()).join(", ");
  const withinText = within.length
    ? `${within.map((lab) => lab.label).join(", ")} ${within.length === 1 ? "is" : "are"} within the provided reference range.`
    : "The report does not list a value clearly inside the printed reference range.";
  const attentionText = attention.length
    ? attention
        .map(
          (lab) =>
            `${lab.label} is ${lab.value} ${lab.unit}. This value is outside or near the provided reference range (${lab.referenceRange}).`,
        )
        .join(" ")
    : "No listed value sits outside the provided reference range.";
  const doctorLine =
    review?.status === "modified"
      ? `Your doctor modified the AI note before approving this explanation. Your doctor noted: ${review.editedFinding ?? review.decisionNote}`
      : "Your doctor reviewed the original numbers, the AI clinical insight, and the missing-information notes.";

  const voiceScript = [
    "Here is a simple explanation of your report.",
    "Your doctor has reviewed this information.",
    `The tests performed included ${checked || report.title}.`,
    "The report indicates the following.",
    withinText,
    attentionText,
    "Important observations are for discussion with your doctor. They are not a diagnosis.",
    "Missing information may include previous results and how long any symptoms have lasted.",
    doctorLine,
    "You can discuss how you have been feeling and whether older results are available.",
    "Discuss this finding with your doctor.",
  ].join(" ");

  if (curated && review?.status === "modified") {
    return {
      ...curated,
      summary: `${review.editedFinding ?? curated.summary} Your doctor modified the AI note before sharing this explanation. This is not a diagnosis.`,
      whatDoctorReviewed: doctorLine,
      voiceScript,
    };
  }

  return {
    summary: `Your report shows results from ${report.title}. ${attentionText} This is not a diagnosis. Discuss this finding with your doctor.`,
    whatWasChecked: `This report looked at ${checked || report.title}.`,
    whatWasFound: `${withinText} ${attentionText} The report indicates these observations only. This is not a diagnosis.`,
    whatDoctorReviewed: doctorLine,
    whatToDiscuss:
      "You may wish to discuss how you have been feeling, how long any symptoms have lasted, and whether previous results are available.",
    voiceScript,
  };
}

export function createSeedState(): DemoState {
  return {
    reports: structuredClone(reports),
    insights: structuredClone(insights),
    reviews: structuredClone(reviews),
    auditLogs: structuredClone(auditLogs),
    notifications: structuredClone(notifications),
  };
}

export function getPatientById(id: string) {
  return DEMO_PATIENTS.find((patient) => patient.id === id);
}

export function getDoctorById(id: string) {
  return DEMO_DOCTORS.find((doctor) => doctor.id === id);
}

export const DEMO_CBC_TEMPLATE: Omit<MedicalReport, "id" | "uploadedAt"> = {
  patientId: "patient-arun",
  doctorId: "doctor-1",
  title: "Complete Blood Count",
  type: "CBC",
  processingStatus: "processing",
  doctorReviewStatus: "pending",
  isSynthetic: true,
  notes: "Loaded from demo sample. Synthetic data only.",
  labValues: arunCbcSept,
};
