import type {
  AllergyRecord,
  ClinicalObservation,
  ClinicalVisit,
  GraphEdge,
  GraphNode,
  MedicationSafetyRow,
} from "./types";

export const DEMO_PATIENT_ID = "patient-arun";

export function createVisits(): ClinicalVisit[] {
  return [
    {
      id: "visit-jun",
      patient_id: DEMO_PATIENT_ID,
      date: "2026-06-04",
      label: "June visit",
      report_id: "rpt-cbc-jun",
      file_name: "CBC_Jun_2026.pdf",
      summary: "Routine",
    },
    {
      id: "visit-aug",
      patient_id: DEMO_PATIENT_ID,
      date: "2026-08-12",
      label: "August visit",
      report_id: "rpt-cbc-aug",
      file_name: "CBC_Aug_2026.pdf",
      summary: "1 finding reviewed",
    },
    {
      id: "visit-sep",
      patient_id: DEMO_PATIENT_ID,
      date: "2026-09-22",
      label: "September visit",
      report_id: "rpt-cbc",
      file_name: "CBC_Report.pdf",
      summary: "3 findings need review",
    },
  ];
}

export function createObservations(): ClinicalObservation[] {
  const rows: Array<[string, string, string, string, number, string, number, number, string]> = [
    ["obs-hb-jun", "visit-jun", "rpt-cbc-jun", "2026-06-04", 12.0, "g/dL", 1, 8, "Hemoglobin 12.0 g/dL"],
    ["obs-hb-aug", "visit-aug", "rpt-cbc-aug", "2026-08-12", 11.2, "g/dL", 1, 8, "Hemoglobin 11.2 g/dL"],
    ["obs-hb-sep", "visit-sep", "rpt-cbc", "2026-09-22", 9.8, "g/dL", 1, 8, "Hemoglobin 9.8 g/dL"],
    ["obs-mcv-jun", "visit-jun", "rpt-cbc-jun", "2026-06-04", 82, "fL", 1, 9, "MCV 82 fL"],
    ["obs-mcv-aug", "visit-aug", "rpt-cbc-aug", "2026-08-12", 79, "fL", 1, 9, "MCV 79 fL"],
    ["obs-mcv-sep", "visit-sep", "rpt-cbc", "2026-09-22", 76, "fL", 1, 9, "MCV 76 fL"],
    ["obs-plt-jun", "visit-jun", "rpt-cbc-jun", "2026-06-04", 210, "x10^3/uL", 1, 20, "Platelets 210 x10^3/uL"],
    ["obs-plt-aug", "visit-aug", "rpt-cbc-aug", "2026-08-12", 180, "x10^3/uL", 1, 20, "Platelets 180 x10^3/uL"],
    ["obs-plt-sep", "visit-sep", "rpt-cbc", "2026-09-22", 145, "x10^3/uL", 1, 20, "Platelets 145 x10^3/uL"],
    ["obs-wbc-sep", "visit-sep", "rpt-cbc", "2026-09-22", 7.2, "x10^3/uL", 1, 14, "WBC 7.2 x10^3/uL"],
    ["obs-glu-sep", "visit-sep", "rpt-cbc", "2026-09-22", 92, "mg/dL", 1, 22, "Glucose 92 mg/dL"],
  ];
  return rows.map(([id, visit, report, date, value, unit, page, line, text]) => ({
    id,
    patient_id: DEMO_PATIENT_ID,
    visit_id: visit,
    report_id: report,
    test_name: text.split(" ")[0] === "Platelets" ? "Platelets" : text.startsWith("Hemoglobin") ? "Hemoglobin" : text.startsWith("MCV") ? "MCV" : text.startsWith("WBC") ? "WBC" : "Glucose",
    value,
    unit,
    date,
    file_name: report === "rpt-cbc" ? "CBC_Report.pdf" : report === "rpt-cbc-aug" ? "CBC_Aug_2026.pdf" : "CBC_Jun_2026.pdf",
    source_page: page,
    source_line: line,
    source_text: text,
  }));
}

export function createAllergies(): AllergyRecord[] {
  return [
    {
      id: "alg-penicillin",
      patient_id: DEMO_PATIENT_ID,
      substance: "Penicillin",
      source: "Patient allergy record",
    },
  ];
}

export function createSafetyChecks(): MedicationSafetyRow[] {
  return [
    {
      id: "safe-amox",
      patient_id: DEMO_PATIENT_ID,
      medication: "Amoxicillin",
      allergy: "Penicillin allergy",
      interaction: "Potential allergy concern",
      evidence: "Patient profile",
      status: "warning",
      doctor_decision: "pending",
      why: [
        "Patient allergy: Penicillin",
        "Medication: Amoxicillin",
        "Safety rule: Configured allergy relationship",
        "Source: Patient allergy record",
      ],
      patient_visible: false,
      decided_at: null,
    },
    {
      id: "safe-para",
      patient_id: DEMO_PATIENT_ID,
      medication: "Paracetamol",
      allergy: "No recorded relevant allergy",
      interaction: "No configured concern",
      evidence: "Patient profile",
      status: "clear",
      doctor_decision: "approved",
      why: ["No configured relationship between Paracetamol and the recorded allergy list."],
      patient_visible: false,
      decided_at: "2026-09-22T09:40:00+05:30",
    },
  ];
}

export function buildKnowledgeGraph(input: {
  patientId: string;
  patientName: string;
  visits: ClinicalVisit[];
  allergies: AllergyRecord[];
  safety: MedicationSafetyRow[];
}): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    {
      id: `node-patient-${input.patientId}`,
      patient_id: input.patientId,
      node_type: "PATIENT",
      entity_id: input.patientId,
      label: input.patientName,
    },
  ];
  const edges: GraphEdge[] = [];
  for (const visit of input.visits.filter((item) => item.patient_id === input.patientId)) {
    const visitNode = `node-${visit.id}`;
    const reportNode = `node-report-${visit.report_id}`;
    nodes.push({
      id: visitNode,
      patient_id: input.patientId,
      node_type: "VISIT",
      entity_id: visit.id,
      label: visit.date.slice(0, 7),
    });
    nodes.push({
      id: reportNode,
      patient_id: input.patientId,
      node_type: "REPORT",
      entity_id: visit.report_id,
      label: visit.file_name,
    });
    edges.push({
      id: `edge-${visit.id}`,
      patient_id: input.patientId,
      source_node_id: `node-patient-${input.patientId}`,
      target_node_id: visitNode,
      relationship: "HAS_VISIT",
    });
    edges.push({
      id: `edge-report-${visit.id}`,
      patient_id: input.patientId,
      source_node_id: visitNode,
      target_node_id: reportNode,
      relationship: "HAS_REPORT",
    });
  }
  for (const allergy of input.allergies.filter((item) => item.patient_id === input.patientId)) {
    const id = `node-${allergy.id}`;
    nodes.push({
      id,
      patient_id: input.patientId,
      node_type: "ALLERGY",
      entity_id: allergy.id,
      label: allergy.substance,
    });
    edges.push({
      id: `edge-${allergy.id}`,
      patient_id: input.patientId,
      source_node_id: `node-patient-${input.patientId}`,
      target_node_id: id,
      relationship: "HAS_ALLERGY",
    });
  }
  for (const row of input.safety.filter((item) => item.patient_id === input.patientId)) {
    const id = `node-med-${row.id}`;
    nodes.push({
      id,
      patient_id: input.patientId,
      node_type: "MEDICATION",
      entity_id: row.id,
      label: row.medication,
    });
    edges.push({
      id: `edge-med-${row.id}`,
      patient_id: input.patientId,
      source_node_id: `node-patient-${input.patientId}`,
      target_node_id: id,
      relationship: "HAS_MEDICATION",
    });
  }
  return { nodes, edges };
}

export function compareSeries(points: { date: string; value: number }[]) {
  const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const current = sorted.at(-1);
  const previous = sorted.at(-2);
  if (!current || !previous) return null;
  const delta = Math.round((current.value - previous.value) * 10) / 10;
  const percent = previous.value === 0 ? null : Math.round((delta / previous.value) * 1000) / 10;
  return { current, previous, delta, percent, points: sorted };
}
