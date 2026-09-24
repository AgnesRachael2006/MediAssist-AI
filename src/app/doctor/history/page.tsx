"use client";

import { ClinicalTimeline } from "@/components/triadic/ClinicalTimeline";
import { useDemoStore } from "@/lib/useDemoStore";

export default function PatientHistoryPage() {
  const { visits, observations } = useDemoStore();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Patient history</h2>
        <p className="mt-1 text-sm text-slate-500">
          Stored visits for Arun Kumar. Numbers are calculated from recorded observations.
        </p>
      </div>
      <ClinicalTimeline visits={visits} observations={observations} />
    </div>
  );
}
