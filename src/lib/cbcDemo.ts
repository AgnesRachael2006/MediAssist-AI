import type { FindingCard, JevReasonCode, SourceLine, TrendSeries, TriadicAuditEvent } from "./types";

export const CBC_REPORT_ID = "rpt-cbc";
export const CBC_FILE_NAME = "CBC_Report.pdf";

const created = "2026-09-22T09:43:00+05:30";

function card(
  partial: Pick<
    FindingCard,
    | "id"
    | "test_name"
    | "value"
    | "unit"
    | "reference_range"
    | "source"
    | "teach"
    | "checks"
    | "previous_value"
    | "ai_draft"
  > & {
    previous_unit?: string | null;
    overclaim_detail?: FindingCard["overclaim_detail"];
    jev: Omit<FindingCard["jev"], "reason_codes"> & { reason_codes?: JevReasonCode[] };
  },
): FindingCard {
  const reasonCodes: JevReasonCode[] = partial.jev.reason_codes?.length
    ? partial.jev.reason_codes
    : partial.jev.overclaim
      ? ["POSSIBLE_OVERCLAIM"]
      : partial.jev.triage === "routine_normal"
        ? ["ROUTINE_NORMAL"]
        : partial.jev.triage === "insufficient"
          ? ["INSUFFICIENT_CONTEXT"]
          : ["OUTSIDE_REFERENCE_RANGE"];
  return {
    report_id: CBC_REPORT_ID,
    previous_unit: partial.previous_unit ?? partial.unit,
    gemini_rewrite: null,
    overclaim_detail: null,
    doctor_decision: "pending",
    final_text: null,
    final_text_ta: null,
    final_text_kn: null,
    patient_visible: false,
    doctor_name: null,
    decided_at: null,
    reject_reason: null,
    created_at: created,
    updated_at: created,
    ...partial,
    jev: { ...partial.jev, reason_codes: reasonCodes },
  };
}

export function createCbcFindings(): FindingCard[] {
  return [
    card({
      id: "f-hb",
      test_name: "Hemoglobin",
      value: 9.8,
      unit: "g/dL",
      reference_range: "12.0 - 16.0 g/dL",
      previous_value: 10.6,
      source: {
        page: 1,
        line_start: 8,
        line_end: 8,
        excerpt: "Hemoglobin ........ 9.8 g/dL    Reference 12.0 - 16.0 g/dL",
      },
      jev: {
        triage: "review_needed",
        evidence: "strong",
        overclaim: true,
        reason_codes: ["OUTSIDE_REFERENCE_RANGE", "TREND_CHANGE", "POSSIBLE_OVERCLAIM"],
      },
      overclaim_detail: {
        available: ["Hemoglobin 9.8 g/dL", "MCV 72 fL"],
        missing: ["Ferritin", "Iron studies"],
      },
      checks: {
        source_found: true,
        value_extracted: true,
        reference_available: true,
        outside_range: true,
        previous_available: true,
      },
      teach: {
        bullets: [
          "Outside reference range 12.0 - 16.0 g/dL",
          "Previous value available: 10.6 g/dL",
          "Numerical change: -0.8 g/dL",
          "The current value is outside the provided reference range and differs from the previous recorded value.",
        ],
      },
      ai_draft: "These results indicate that the patient has iron-deficiency anemia.",
    }),
    card({
      id: "f-mcv",
      test_name: "MCV",
      value: 72,
      unit: "fL",
      reference_range: "80 - 100 fL",
      previous_value: 75,
      source: {
        page: 1,
        line_start: 9,
        line_end: 9,
        excerpt: "MCV .............. 72 fL       Reference 80 - 100 fL",
      },
      jev: {
        triage: "review_needed",
        evidence: "moderate",
        overclaim: false,
        reason_codes: ["OUTSIDE_REFERENCE_RANGE", "TREND_CHANGE"],
      },
      checks: {
        source_found: true,
        value_extracted: true,
        reference_available: true,
        outside_range: true,
        previous_available: true,
      },
      teach: {
        bullets: [
          "72 fL is below the supplied range of 80 - 100 fL",
          "Previous value available: 75 fL",
          "Numerical change: -3 fL",
        ],
      },
      ai_draft: "Value is below the reference range provided in this report.",
    }),
    card({
      id: "f-wbc",
      test_name: "WBC",
      value: 7.2,
      unit: "x10^3/uL",
      reference_range: "4.0 - 11.0 x10^3/uL",
      previous_value: 6.8,
      source: {
        page: 1,
        line_start: 14,
        line_end: 14,
        excerpt: "WBC .............. 7.2 x10^3/uL    Reference 4.0 - 11.0",
      },
      jev: { triage: "routine_normal", evidence: "strong", overclaim: false, reason_codes: ["ROUTINE_NORMAL"] },
      checks: routineChecks(false, true),
      teach: { bullets: ["7.2 x10^3/uL sits inside 4.0 - 11.0 x10^3/uL"] },
      ai_draft: "Value is within the reference range provided in this report.",
    }),
    card({
      id: "f-rbc",
      test_name: "RBC",
      value: 4.6,
      unit: "x10^6/uL",
      reference_range: "4.2 - 5.4 x10^6/uL",
      previous_value: 4.7,
      source: {
        page: 1,
        line_start: 6,
        line_end: 6,
        excerpt: "RBC .............. 4.6 x10^6/uL    Reference 4.2 - 5.4",
      },
      jev: { triage: "routine_normal", evidence: "strong", overclaim: false },
      checks: routineChecks(false, true),
      teach: { bullets: ["4.6 x10^6/uL sits inside 4.2 - 5.4 x10^6/uL"] },
      ai_draft: "Value is within the reference range provided in this report.",
    }),
    card({
      id: "f-hct",
      test_name: "Hematocrit",
      value: 40,
      unit: "%",
      reference_range: "36 - 46 %",
      previous_value: 39,
      source: {
        page: 1,
        line_start: 7,
        line_end: 7,
        excerpt: "Hematocrit ....... 40 %        Reference 36 - 46 %",
      },
      jev: { triage: "routine_normal", evidence: "strong", overclaim: false },
      checks: routineChecks(false, true),
      teach: { bullets: ["40 % sits inside 36 - 46 %"] },
      ai_draft: "Value is within the reference range provided in this report.",
    }),
    card({
      id: "f-mch",
      test_name: "MCH",
      value: 29,
      unit: "pg",
      reference_range: "27 - 31 pg",
      previous_value: 29,
      source: {
        page: 1,
        line_start: 10,
        line_end: 10,
        excerpt: "MCH .............. 29 pg       Reference 27 - 31 pg",
      },
      jev: { triage: "routine_normal", evidence: "moderate", overclaim: false },
      checks: routineChecks(false, true),
      teach: { bullets: ["29 pg sits inside 27 - 31 pg"] },
      ai_draft: "Value is within the reference range provided in this report.",
    }),
    card({
      id: "f-mchc",
      test_name: "MCHC",
      value: 33,
      unit: "g/dL",
      reference_range: "32 - 36 g/dL",
      previous_value: 33.1,
      source: {
        page: 1,
        line_start: 11,
        line_end: 11,
        excerpt: "MCHC ............. 33 g/dL     Reference 32 - 36 g/dL",
      },
      jev: { triage: "routine_normal", evidence: "moderate", overclaim: false },
      checks: routineChecks(false, true),
      teach: { bullets: ["33 g/dL sits inside 32 - 36 g/dL"] },
      ai_draft: "Value is within the reference range provided in this report.",
    }),
    card({
      id: "f-rdw",
      test_name: "RDW",
      value: 13.2,
      unit: "%",
      reference_range: "",
      previous_value: null,
      source: {
        page: 1,
        line_start: 12,
        line_end: 12,
        excerpt: "RDW .............. 13.2 %      Reference not printed",
      },
      jev: {
        triage: "insufficient",
        evidence: "insufficient",
        overclaim: false,
        reason_codes: ["MISSING_REFERENCE_RANGE"],
      },
      checks: {
        source_found: true,
        value_extracted: true,
        reference_available: false,
        outside_range: false,
        previous_available: false,
      },
      teach: { bullets: ["13.2 % was extracted.", "No reference range was printed on this row."] },
      ai_draft: "Value is within the reference range provided in this report.",
    }),
    card({
      id: "f-neut",
      test_name: "Neutrophils",
      value: 58,
      unit: "%",
      reference_range: "40 - 70 %",
      previous_value: 55,
      source: {
        page: 1,
        line_start: 15,
        line_end: 15,
        excerpt: "Neutrophils ...... 58 %        Reference 40 - 70 %",
      },
      jev: { triage: "routine_normal", evidence: "strong", overclaim: false },
      checks: routineChecks(false, true),
      teach: { bullets: ["58 % sits inside 40 - 70 %"] },
      ai_draft: "Value is within the reference range provided in this report.",
    }),
    card({
      id: "f-lymph",
      test_name: "Lymphocytes",
      value: 32,
      unit: "%",
      reference_range: "20 - 40 %",
      previous_value: 34,
      source: {
        page: 1,
        line_start: 16,
        line_end: 16,
        excerpt: "Lymphocytes ...... 32 %        Reference 20 - 40 %",
      },
      jev: { triage: "routine_normal", evidence: "strong", overclaim: false },
      checks: routineChecks(false, true),
      teach: { bullets: ["32 % sits inside 20 - 40 %"] },
      ai_draft: "Value is within the reference range provided in this report.",
    }),
    card({
      id: "f-mono",
      test_name: "Monocytes",
      value: 6,
      unit: "%",
      reference_range: "2 - 8 %",
      previous_value: 6,
      source: {
        page: 1,
        line_start: 17,
        line_end: 17,
        excerpt: "Monocytes ........ 6 %         Reference 2 - 8 %",
      },
      jev: { triage: "routine_normal", evidence: "moderate", overclaim: false },
      checks: routineChecks(false, true),
      teach: { bullets: ["6 % sits inside 2 - 8 %"] },
      ai_draft: "Value is within the reference range provided in this report.",
    }),
    card({
      id: "f-eos",
      test_name: "Eosinophils",
      value: 2,
      unit: "%",
      reference_range: "1 - 4 %",
      previous_value: 2,
      source: {
        page: 1,
        line_start: 18,
        line_end: 18,
        excerpt: "Eosinophils ...... 2 %         Reference 1 - 4 %",
      },
      jev: { triage: "routine_normal", evidence: "moderate", overclaim: false },
      checks: routineChecks(false, true),
      teach: { bullets: ["2 % sits inside 1 - 4 %"] },
      ai_draft: "Value is within the reference range provided in this report.",
    }),
    card({
      id: "f-plt",
      test_name: "Platelets",
      value: 228,
      unit: "x10^3/uL",
      reference_range: "150 - 450 x10^3/uL",
      previous_value: 224,
      source: {
        page: 1,
        line_start: 20,
        line_end: 20,
        excerpt: "Platelets ........ 228 x10^3/uL   Reference 150 - 450",
      },
      jev: {
        triage: "routine_normal",
        evidence: "strong",
        overclaim: false,
        reason_codes: ["ROUTINE_NORMAL"],
      },
      checks: routineChecks(false, true),
      teach: {
        bullets: ["228 x10^3/uL sits inside 150 - 450 x10^3/uL"],
      },
      ai_draft: "Value is within the reference range provided in this report.",
    }),
    card({
      id: "f-glu",
      test_name: "Glucose",
      value: 92,
      unit: "mg/dL",
      reference_range: "70 - 99 mg/dL",
      previous_value: 94,
      source: {
        page: 1,
        line_start: 22,
        line_end: 22,
        excerpt: "Glucose .......... 92 mg/dL    Reference 70 - 99 mg/dL",
      },
      jev: { triage: "routine_normal", evidence: "strong", overclaim: false },
      checks: routineChecks(false, true),
      teach: { bullets: ["92 mg/dL sits inside 70 - 99 mg/dL"] },
      ai_draft: "Value is within the reference range provided in this report.",
    }),
  ];
}

function routineChecks(outside: boolean, previous: boolean): FindingCard["checks"] {
  return {
    source_found: true,
    value_extracted: true,
    reference_available: true,
    outside_range: outside,
    previous_available: previous,
  };
}

export function createCbcSourceLines(): SourceLine[] {
  const rows = [
    [1, "COMPLETE BLOOD COUNT"],
    [2, "Patient: Arun Kumar · Synthetic record"],
    [3, "File: CBC_Report.pdf"],
    [4, "Test                  Result              Reference"],
    [6, "RBC .............. 4.6 x10^6/uL    Reference 4.2 - 5.4"],
    [7, "Hematocrit ....... 40 %            Reference 36 - 46 %"],
    [8, "Hemoglobin ........ 9.8 g/dL       Reference 12.0 - 16.0"],
    [9, "MCV .............. 72 fL           Reference 80 - 100"],
    [10, "MCH .............. 29 pg           Reference 27 - 31"],
    [11, "MCHC ............. 33 g/dL         Reference 32 - 36"],
    [12, "RDW .............. 13.2 %          Reference 11.5 - 14.5"],
    [14, "WBC .............. 7.2 x10^3/uL    Reference 4.0 - 11.0"],
    [15, "Neutrophils ...... 58 %            Reference 40 - 70"],
    [16, "Lymphocytes ...... 32 %            Reference 20 - 40"],
    [17, "Monocytes ........ 6 %             Reference 2 - 8"],
    [18, "Eosinophils ...... 2 %             Reference 1 - 4"],
    [20, "Platelets ........ 228 x10^3/uL    Reference 150 - 450"],
    [22, "Glucose .......... 92 mg/dL        Reference 70 - 99"],
    [24, "Previous hemoglobin 10.6 g/dL recorded 18 Jul 2026"],
  ] as const;
  return rows.map(([line, text]) => ({
    report_id: CBC_REPORT_ID,
    page: 1,
    line,
    text,
  }));
}

export function createCbcTrends(): TrendSeries[] {
  return [
    {
      metric: "Hemoglobin",
      unit: "g/dL",
      points: [
        { date: "2026-03-12", value: 11.2 },
        { date: "2026-07-18", value: 10.6 },
        { date: "2026-09-22", value: 9.8 },
      ],
    },
    {
      metric: "WBC",
      unit: "x10^3/uL",
      points: [
        { date: "2026-03-12", value: 7.2 },
        { date: "2026-07-18", value: 7.1 },
        { date: "2026-09-22", value: 7.4 },
      ],
    },
    {
      metric: "Platelets",
      unit: "x10^3/uL",
      points: [
        { date: "2026-03-12", value: 220 },
        { date: "2026-07-18", value: 224 },
        { date: "2026-09-22", value: 228 },
      ],
    },
    {
      metric: "Glucose",
      unit: "mg/dL",
      points: [
        { date: "2026-06-04", value: 90 },
        { date: "2026-08-12", value: 94 },
        { date: "2026-09-22", value: 92 },
      ],
    },
  ];
}

export function createCbcAuditSeed(): TriadicAuditEvent[] {
  return [
    {
      id: "tev-1",
      report_id: CBC_REPORT_ID,
      timestamp: "2026-09-22T09:42:00+05:30",
      actor: "System",
      actor_kind: "system",
      action: "Report uploaded",
      detail: "CBC_Report.pdf uploaded for Arun Kumar. Synthetic file only.",
    },
    {
      id: "tev-2",
      report_id: CBC_REPORT_ID,
      timestamp: "2026-09-22T09:43:00+05:30",
      actor: "PDF extraction",
      actor_kind: "system",
      action: "PDF extracted",
      detail: "Fourteen laboratory rows were extracted from page 1.",
    },
    {
      id: "tev-2b",
      report_id: CBC_REPORT_ID,
      timestamp: "2026-09-22T09:43:10+05:30",
      actor: "Gemini",
      actor_kind: "ai",
      action: "Gemini generated draft",
      detail: "A draft was stored separately for each extracted row.",
    },
    {
      id: "tev-3",
      report_id: CBC_REPORT_ID,
      timestamp: "2026-09-22T09:43:20+05:30",
      actor: "Jev",
      actor_kind: "jev",
      action: "Jev flagged possible overclaim",
      detail: "Hemoglobin, MCV, and Platelets need review. Eleven rows are routine. The hemoglobin draft names a diagnosis the row does not establish.",
    },
  ];
}

export function needsDoctorReview(finding: FindingCard) {
  return finding.jev.triage === "review_needed" || finding.jev.triage === "insufficient";
}

export function countPipeline(findings: FindingCard[]) {
  return {
    rows_extracted: findings.length,
    review_needed: findings.filter((finding) => finding.jev.triage === "review_needed").length,
    routine_normal: findings.filter((finding) => finding.jev.triage === "routine_normal").length,
    insufficient: findings.filter((finding) => finding.jev.triage === "insufficient").length,
    approved: findings.filter(
      (finding) => finding.doctor_decision === "accepted" || finding.doctor_decision === "edited",
    ).length,
    rejected: findings.filter((finding) => finding.doctor_decision === "rejected").length,
    pending: findings.filter(
      (finding) => needsDoctorReview(finding) && finding.doctor_decision === "pending",
    ).length,
    patient_visible: findings.filter((finding) => finding.patient_visible).length,
  };
}
