"use client";

import { useMemo } from "react";
import { ClinicalGraph } from "@/components/triadic/ClinicalGraph";
import { buildKnowledgeGraph } from "@/lib/clinicalContext";
import { getPatientById } from "@/lib/mockData";
import { useDemoStore } from "@/lib/useDemoStore";

export default function ClinicalGraphPage() {
  const { visits, allergies, safetyChecks, observations, findings, reports } = useDemoStore();
  const patientId = "patient-arun";
  const patient = getPatientById(patientId);
  const graph = useMemo(
    () =>
      buildKnowledgeGraph({
        patientId,
        patientName: patient?.name ?? "Synthetic patient",
        visits,
        allergies,
        safety: safetyChecks,
      }),
    [patient, visits, allergies, safetyChecks],
  );
  const context = useMemo(
    () => ({ patient, visits, observations, findings, reports, allergies, safetyChecks }),
    [patient, visits, observations, findings, reports, allergies, safetyChecks],
  );

  return (
    <ClinicalGraph
      nodes={graph.nodes}
      edges={graph.edges}
      context={context}
      title="Clinical knowledge graph"
      description="Patient records, clinical findings, reports, medications, and outcomes — connected in one view."
    />
  );
}
