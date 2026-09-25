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
      id: "visit-mar",
      patient_id: DEMO_PATIENT_ID,
      date: "2026-03-12",
      label: "March visit",
      report_id: "rpt-cbc-mar",
      file_name: "CBC_Mar_2026.pdf",
      summary: "CBC report",
    },
    {
      id: "visit-jul",
      patient_id: DEMO_PATIENT_ID,
      date: "2026-07-18",
      label: "July visit",
      report_id: "rpt-cbc-jul",
      file_name: "CBC_Jul_2026.pdf",
      summary: "CBC report and consultation",
    },
    {
      id: "visit-sep",
      patient_id: DEMO_PATIENT_ID,
      date: "2026-09-22",
      label: "September visit",
      report_id: "rpt-cbc",
      file_name: "CBC_Report.pdf",
      summary: "CBC report",
    },
  ];
}

export function createObservations(): ClinicalObservation[] {
  const rows: Array<[string, string, string, string, number, string, number, number, string]> = [
    ["obs-hb-mar", "visit-mar", "rpt-cbc-mar", "2026-03-12", 11.2, "g/dL", 1, 8, "Hemoglobin 11.2 g/dL"],
    ["obs-hb-jul", "visit-jul", "rpt-cbc-jul", "2026-07-18", 10.6, "g/dL", 1, 8, "Hemoglobin 10.6 g/dL"],
    ["obs-hb-sep", "visit-sep", "rpt-cbc", "2026-09-22", 9.8, "g/dL", 1, 8, "Hemoglobin 9.8 g/dL"],
    ["obs-hb-nodate", "visit-jul", "rpt-cbc-jul", "", 10.1, "g/dL", 1, 8, "Hemoglobin 10.1 g/dL undated"],
    ["obs-mcv-mar", "visit-mar", "rpt-cbc-mar", "2026-03-12", 78, "fL", 1, 9, "MCV 78 fL"],
    ["obs-mcv-jul", "visit-jul", "rpt-cbc-jul", "2026-07-18", 75, "fL", 1, 9, "MCV 75 fL"],
    ["obs-mcv-sep", "visit-sep", "rpt-cbc", "2026-09-22", 72, "fL", 1, 9, "MCV 72 fL"],
    ["obs-plt-mar", "visit-mar", "rpt-cbc-mar", "2026-03-12", 220, "x10^3/uL", 1, 20, "Platelets 220 x10^3/uL"],
    ["obs-plt-jul", "visit-jul", "rpt-cbc-jul", "2026-07-18", 224, "x10^3/uL", 1, 20, "Platelets 224 x10^3/uL"],
    ["obs-plt-sep", "visit-sep", "rpt-cbc", "2026-09-22", 228, "x10^3/uL", 1, 20, "Platelets 228 x10^3/uL"],
    ["obs-wbc-mar", "visit-mar", "rpt-cbc-mar", "2026-03-12", 7.2, "x10^3/uL", 1, 14, "WBC 7.2 x10^3/uL"],
    ["obs-wbc-jul", "visit-jul", "rpt-cbc-jul", "2026-07-18", 7.1, "x10^3/uL", 1, 14, "WBC 7.1 x10^3/uL"],
    ["obs-wbc-sep", "visit-sep", "rpt-cbc", "2026-09-22", 7.4, "x10^3/uL", 1, 14, "WBC 7.4 x10^3/uL"],
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
    file_name:
      report === "rpt-cbc" ? "CBC_Report.pdf" : report === "rpt-cbc-jul" ? "CBC_Jul_2026.pdf" : "CBC_Mar_2026.pdf",
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
      recorded_at: "2026-03-12",
      claim: "present",
      patient_visible: true,
    },
    {
      id: "alg-none-july",
      patient_id: DEMO_PATIENT_ID,
      substance: "No known drug allergies",
      source: "July consultation note",
      recorded_at: "2026-07-18",
      claim: "none_recorded",
      patient_visible: false,
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
      patient_visible: true,
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
  const sorted = [...points]
    .filter((point) => point.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const current = sorted.at(-1);
  const previous = sorted.at(-2);
  if (!current || !previous) return null;
  const delta = Math.round((current.value - previous.value) * 10) / 10;
  const percent = previous.value === 0 ? null : Math.round((delta / previous.value) * 1000) / 10;
  return { current, previous, delta, percent, points: sorted };
}
