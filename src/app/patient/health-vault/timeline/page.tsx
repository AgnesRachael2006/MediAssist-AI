"use client";

import { ClinicalTimeline } from "@/components/triadic/ClinicalTimeline";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";

export default function VaultTimelinePage() {
  const { patientId } = usePatientSession();
  const { visits, observations } = useDemoStore();
  return (
    <ClinicalTimeline
      visits={visits.filter((item) => item.patient_id === patientId)}
      observations={observations.filter((item) => item.patient_id === patientId)}
      showHeading={false}
      patientView
    />
  );
}
