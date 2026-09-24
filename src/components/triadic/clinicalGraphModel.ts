import { needsDoctorReview } from "@/lib/cbcDemo";
import type {
  AllergyRecord,
  ClinicalObservation,
  ClinicalVisit,
  FindingCard,
  GraphEdge,
  GraphNode,
  MedicalReport,
  Medication,
  MedicationSafetyRow,
  Patient,
} from "@/lib/types";

/*
 * View model for the clinical knowledge graph. Everything here is derived from
 * records already in the page (the stored graph plus the demo store) — it adds
 * layout and display context, never new clinical data.
 */

export type EntityKind = "patient" | "visit" | "report" | "issue" | "medication" | "allergy";

export const FILTERABLE_KINDS: Exclude<EntityKind, "patient">[] = [
  "visit",
  "issue",
  "report",
  "medication",
  "allergy",
];

export const KIND_META: Record<EntityKind, { label: string; plural: string; dot: string; text: string; stroke: string }> = {
  patient: { label: "Patient", plural: "Patient", dot: "bg-indigo-600", text: "text-indigo-700", stroke: "#4f46e5" },
  visit: { label: "Visit", plural: "Visits", dot: "bg-indigo-400", text: "text-indigo-700", stroke: "#818cf8" },
  report: { label: "Report", plural: "Reports", dot: "bg-sky-500", text: "text-sky-700", stroke: "#0ea5e9" },
  issue: { label: "Clinical issue", plural: "Issues", dot: "bg-amber-500", text: "text-amber-700", stroke: "#f59e0b" },
  medication: { label: "Medication", plural: "Medications", dot: "bg-teal-500", text: "text-teal-700", stroke: "#14b8a6" },
  allergy: { label: "Allergy", plural: "Allergies", dot: "bg-rose-500", text: "text-rose-700", stroke: "#f43f5e" },
};

type Box = { id: string; x: number; y: number; w: number; h: number };

export type PatientEntity = Box & {
  kind: "patient";
  name: string;
  patient: Patient | undefined;
};
export type VisitEntity = Box & {
  kind: "visit";
  visit: ClinicalVisit;
  observations: ClinicalObservation[];
  findings: FindingCard[];
  latest: boolean;
};
export type ReportEntity = Box & {
  kind: "report";
  visit: ClinicalVisit;
  report: MedicalReport | undefined;
  observations: ClinicalObservation[];
  findings: FindingCard[];
};
export type IssueEntity = Box & {
  kind: "issue";
  finding: FindingCard;
  direction: "below" | "above" | null;
  series: ClinicalObservation[];
  visit: ClinicalVisit | undefined;
};
export type MedicationEntity = Box & {
  kind: "medication";
  safety: MedicationSafetyRow;
  regimen: Medication | undefined;
};
export type AllergyEntity = Box & {
  kind: "allergy";
  allergy: AllergyRecord;
  concerns: MedicationSafetyRow[];
};

export type GraphEntity =
  | PatientEntity
  | VisitEntity
  | ReportEntity
  | IssueEntity
  | MedicationEntity
  | AllergyEntity;

export type GraphLink = {
  id: string;
  source: string;
  target: string;
  relationship: string;
  label: string;
  axis: "vertical" | "horizontal" | "arc";
  tone: "default" | "warning";
};

export type GraphCaption = { id: string; x: number; y: number; w: number; text: string; timeline?: boolean };

export type GraphModel = {
  entities: GraphEntity[];
  links: GraphLink[];
  captions: GraphCaption[];
};

export type GraphContext = {
  patient?: Patient;
  visits: ClinicalVisit[];
  observations: ClinicalObservation[];
  findings: FindingCard[];
  reports: MedicalReport[];
  allergies: AllergyRecord[];
  safetyChecks: MedicationSafetyRow[];
};

export const NODE_W = 212;
export const NODE_H = 152;
export const PATIENT_W = 256;
export const PATIENT_H = 108;

const COL = 272;
const ROW_REPORT = 0;
const ROW_VISIT = 205;
const ROW_PATIENT = 410;
const ROW_SAFETY = 615;
const ISSUE_GAP = 16;

const RELATIONSHIP_LABELS: Record<string, string> = {
  HAS_VISIT: "Has visit",
  HAS_REPORT: "Has report",
  HAS_ALLERGY: "Has allergy",
  HAS_MEDICATION: "Medication",
  FLAGGED: "Flagged",
  ALLERGY_CONCERN: "Allergy concern",
};

export function relationshipLabel(relationship: string) {
  return RELATIONSHIP_LABELS[relationship] ?? relationship.replaceAll("_", " ").toLowerCase();
}

export function parseRange(range: string): [number, number] | null {
  const match = range.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
  return match ? [Number(match[1]), Number(match[2])] : null;
}

function rangeDirection(finding: FindingCard): IssueEntity["direction"] {
  const range = parseRange(finding.reference_range);
  const value = Number(finding.value);
  if (!range || Number.isNaN(value)) return null;
  if (value < range[0]) return "below";
  if (value > range[1]) return "above";
  return null;
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function buildGraphModel(
  graph: { nodes: GraphNode[]; edges: GraphEdge[] },
  context: GraphContext,
): GraphModel {
  const visitsById = new Map(context.visits.map((visit) => [visit.id, visit]));
  const visitsByReport = new Map(context.visits.map((visit) => [visit.report_id, visit]));
  const allergyById = new Map(context.allergies.map((item) => [item.id, item]));
  const safetyById = new Map(context.safetyChecks.map((item) => [item.id, item]));
  const patientNode = graph.nodes.find((node) => node.node_type === "PATIENT");

  const visitNodes = graph.nodes
    .filter((node) => node.node_type === "VISIT" && visitsById.has(node.entity_id))
    .sort((a, b) => visitsById.get(a.entity_id)!.date.localeCompare(visitsById.get(b.entity_id)!.date));
  const reportNodes = graph.nodes.filter((node) => node.node_type === "REPORT" && visitsByReport.has(node.entity_id));
  const allergyNodes = graph.nodes.filter((node) => node.node_type === "ALLERGY" && allergyById.has(node.entity_id));
  const medicationNodes = graph.nodes
    .filter((node) => node.node_type === "MEDICATION" && safetyById.has(node.entity_id))
    // Medications with a recorded concern sit next to the allergies they relate to.
    .sort((a, b) => Number(safetyById.get(a.entity_id)!.status !== "clear") - Number(safetyById.get(b.entity_id)!.status !== "clear"));

  const entities: GraphEntity[] = [];
  const links: GraphLink[] = [];
  const captions: GraphCaption[] = [];

  const visitXs = visitNodes.map((_, index) => index * COL);
  const centerX = visitXs.length ? (visitXs[0] + visitXs[visitXs.length - 1]) / 2 : 0;

  if (patientNode) {
    entities.push({
      id: patientNode.id,
      kind: "patient",
      name: patientNode.label,
      patient: context.patient,
      x: centerX,
      y: ROW_PATIENT,
      w: PATIENT_W,
      h: PATIENT_H,
    });
  }

  const reportNodeByReportId = new Map(reportNodes.map((node) => [node.entity_id, node]));
  visitNodes.forEach((node, index) => {
    const visit = visitsById.get(node.entity_id)!;
    const findings = context.findings.filter((finding) => finding.report_id === visit.report_id);
    entities.push({
      id: node.id,
      kind: "visit",
      visit,
      observations: context.observations.filter((item) => item.visit_id === visit.id),
      findings,
      latest: index === visitNodes.length - 1,
      x: visitXs[index],
      y: ROW_VISIT,
      w: NODE_W,
      h: NODE_H,
    });
    const reportNode = reportNodeByReportId.get(visit.report_id);
    if (reportNode) {
      entities.push({
        id: reportNode.id,
        kind: "report",
        visit,
        report: context.reports.find((item) => item.id === visit.report_id),
        observations: context.observations.filter((item) => item.report_id === visit.report_id),
        findings,
        x: visitXs[index],
        y: ROW_REPORT,
        w: NODE_W,
        h: NODE_H,
      });
    }
    const previous = visitNodes[index - 1];
    if (previous) {
      const days = daysBetween(visitsById.get(previous.entity_id)!.date, visit.date);
      links.push({
        id: `seq-${previous.id}-${node.id}`,
        source: previous.id,
        target: node.id,
        relationship: "FOLLOWED_BY",
        label: `${days} days`,
        axis: "horizontal",
        tone: "default",
      });
    }
  });

  if (visitNodes.length > 1) {
    captions.push({
      id: "timeline",
      x: visitXs[0] - NODE_W / 2,
      y: ROW_REPORT - NODE_H / 2 - 30,
      w: visitXs[visitXs.length - 1] - visitXs[0] + NODE_W,
      text: "Clinical timeline · earlier → latest",
      timeline: true,
    });
  }

  // Clinical issues: findings the review engine sent to the doctor, attached to the report they came from.
  const issueFindings = context.findings.filter(
    (finding) => needsDoctorReview(finding) && reportNodeByReportId.has(finding.report_id),
  );
  if (issueFindings.length) {
    const issueX = (visitXs.at(-1) ?? 0) + COL + 16;
    const midY = (ROW_REPORT + ROW_VISIT) / 2;
    const span = issueFindings.length * NODE_H + (issueFindings.length - 1) * ISSUE_GAP;
    const top = midY - span / 2 + NODE_H / 2;
    issueFindings.forEach((finding, index) => {
      const id = `node-issue-${finding.id}`;
      entities.push({
        id,
        kind: "issue",
        finding,
        direction: rangeDirection(finding),
        series: context.observations
          .filter((item) => item.test_name === finding.test_name)
          .sort((a, b) => a.date.localeCompare(b.date)),
        visit: visitsByReport.get(finding.report_id),
        x: issueX,
        y: top + index * (NODE_H + ISSUE_GAP),
        w: NODE_W,
        h: NODE_H,
      });
      links.push({
        id: `flag-${finding.id}`,
        source: reportNodeByReportId.get(finding.report_id)!.id,
        target: id,
        relationship: "FLAGGED",
        label: relationshipLabel("FLAGGED"),
        axis: "horizontal",
        tone: "default",
      });
    });
    captions.push({
      id: "issues",
      x: issueX - NODE_W / 2,
      y: top - NODE_H / 2 - 24,
      w: NODE_W,
      text: "Flagged for doctor review",
    });
  }

  const safetyRow = [...medicationNodes, ...allergyNodes];
  const safetyStart = centerX - ((safetyRow.length - 1) * COL) / 2;
  safetyRow.forEach((node, index) => {
    const x = safetyStart + index * COL;
    if (node.node_type === "MEDICATION") {
      const safety = safetyById.get(node.entity_id)!;
      entities.push({
        id: node.id,
        kind: "medication",
        safety,
        regimen: context.patient?.currentMedications.find(
          (item) => item.name.toLowerCase() === safety.medication.toLowerCase(),
        ),
        x,
        y: ROW_SAFETY,
        w: NODE_W,
        h: NODE_H,
      });
    } else {
      const allergy = allergyById.get(node.entity_id)!;
      const concerns = context.safetyChecks.filter(
        (row) =>
          row.patient_id === allergy.patient_id &&
          row.status !== "clear" &&
          row.allergy.toLowerCase().includes(allergy.substance.toLowerCase()),
      );
      entities.push({ id: node.id, kind: "allergy", allergy, concerns, x, y: ROW_SAFETY, w: NODE_W, h: NODE_H });
      for (const row of concerns) {
        const target = medicationNodes.find((med) => med.entity_id === row.id);
        if (!target) continue;
        links.push({
          id: `concern-${allergy.id}-${row.id}`,
          source: node.id,
          target: target.id,
          relationship: "ALLERGY_CONCERN",
          label: relationshipLabel("ALLERGY_CONCERN"),
          axis: "arc",
          tone: "warning",
        });
      }
    }
  });

  const present = new Set(entities.map((entity) => entity.id));
  for (const edge of graph.edges) {
    if (!present.has(edge.source_node_id) || !present.has(edge.target_node_id)) continue;
    links.push({
      id: edge.id,
      source: edge.source_node_id,
      target: edge.target_node_id,
      relationship: edge.relationship,
      label: relationshipLabel(edge.relationship),
      axis: "vertical",
      tone: "default",
    });
  }

  return { entities, links, captions };
}

export function modelBounds(entities: GraphEntity[], captions: GraphCaption[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const entity of entities) {
    minX = Math.min(minX, entity.x - entity.w / 2);
    maxX = Math.max(maxX, entity.x + entity.w / 2);
    minY = Math.min(minY, entity.y - entity.h / 2);
    maxY = Math.max(maxY, entity.y + entity.h / 2);
  }
  for (const caption of captions) {
    minY = Math.min(minY, caption.y);
    maxY = Math.max(maxY, caption.y + 16);
  }
  // Room for relationship arcs routed beneath the bottom row.
  maxY += 40;
  if (!Number.isFinite(minX)) return { minX: -200, minY: -150, maxX: 200, maxY: 150 };
  return { minX, minY, maxX, maxY };
}

/* Anchored cubic curve between two entity boxes, plus the point where its label sits. */
export function linkGeometry(link: GraphLink, source: GraphEntity, target: GraphEntity) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  let sx: number, sy: number, tx: number, ty: number, c1x: number, c1y: number, c2x: number, c2y: number;

  if (link.axis === "arc") {
    // Neighbours in the same row: loop underneath so the label has room.
    const right = dx >= 0 ? 1 : -1;
    sx = source.x + (right * source.w) / 4;
    sy = source.y + source.h / 2;
    tx = target.x - (right * target.w) / 4;
    ty = target.y + target.h / 2;
    c1x = sx;
    c1y = sy + 48;
    c2x = tx;
    c2y = ty + 48;
  } else if (link.axis === "vertical") {
    const down = dy >= 0 ? 1 : -1;
    const spread = source.w / 2 - 28;
    sx = source.x + Math.max(-spread, Math.min(spread, dx * 0.28));
    sy = source.y + (down * source.h) / 2;
    tx = target.x;
    ty = target.y - (down * target.h) / 2;
    const bend = Math.max(36, Math.abs(ty - sy) * 0.5);
    c1x = sx;
    c1y = sy + down * bend;
    c2x = tx;
    c2y = ty - down * bend;
  } else {
    const right = dx >= 0 ? 1 : -1;
    const spread = source.h / 2 - 22;
    sx = source.x + (right * source.w) / 2;
    sy = source.y + Math.max(-spread, Math.min(spread, dy * 0.2));
    tx = target.x - (right * target.w) / 2;
    ty = target.y;
    const bend = Math.max(24, Math.abs(tx - sx) * 0.5);
    c1x = sx + right * bend;
    c1y = sy;
    c2x = tx - right * bend;
    c2y = ty;
  }

  return {
    path: `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`,
    label: {
      x: (sx + 3 * c1x + 3 * c2x + tx) / 8,
      y: (sy + 3 * c1y + 3 * c2y + ty) / 8,
    },
  };
}
