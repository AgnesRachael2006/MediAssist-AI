"use client";

import { ClinicalGraph } from "@/components/triadic/ClinicalGraph";
import { buildKnowledgeGraph } from "@/lib/clinicalContext";
import { getPatientById } from "@/lib/mockData";
import { useDemoStore } from "@/lib/useDemoStore";

export default function ClinicalGraphPage() {
  const { visits, allergies, safetyChecks } = useDemoStore();
  const patientId = "patient-arun";
  const graph = buildKnowledgeGraph({
    patientId,
    patientName: getPatientById(patientId)?.name ?? "Synthetic patient",
    visits,
    allergies,
    safety: safetyChecks,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Clinical graph</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Patient, visits, reports, allergies, and medications are linked from stored records. This view does not diagnose.
        </p>
      </div>
      <ClinicalGraph nodes={graph.nodes} edges={graph.edges} />
    </div>
  );
}
