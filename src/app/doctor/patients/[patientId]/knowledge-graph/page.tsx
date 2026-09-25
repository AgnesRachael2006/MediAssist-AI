"use client";

import { use, useMemo } from "react";
import { ClinicalGraph } from "@/components/triadic/ClinicalGraph";
import { buildKnowledgeGraph } from "@/lib/clinicalContext";
import { getPatientById } from "@/lib/mockData";
import { useDemoStore } from "@/lib/useDemoStore";

export default function PatientGraphPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const { visits, allergies, safetyChecks, observations, findings, reports } = useDemoStore();
  const patient = getPatientById(patientId);
  const graph = useMemo(
    () =>
      buildKnowledgeGraph({
        patientId,
        patientName: patient?.name ?? "Patient",
        visits,
        allergies,
        safety: safetyChecks,
      }),
    [patientId, patient, visits, allergies, safetyChecks],
  );

  return (
    <ClinicalGraph
      nodes={graph.nodes}
      edges={graph.edges}
      context={{ patient, visits, observations, findings, reports, allergies, safetyChecks }}
      title="Clinical knowledge graph"
      description="Connections come from stored visits, reports, allergies, and medications."
    />
  );
}
