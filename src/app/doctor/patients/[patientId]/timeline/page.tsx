"use client";

import Link from "next/link";
import { use } from "react";
import { ClinicalTimeline } from "@/components/triadic/ClinicalTimeline";
import { useDemoStore } from "@/lib/useDemoStore";

export default function PatientTimelinePage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const { visits, observations } = useDemoStore();
  const hb = observations.filter((item) => item.patient_id === patientId && item.test_name === "Hemoglobin" && item.date);
  return (
    <div className="space-y-4">
      <ClinicalTimeline
        visits={visits.filter((item) => item.patient_id === patientId)}
        observations={observations.filter((item) => item.patient_id === patientId)}
      />
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <h3 className="font-semibold text-slate-900">Hemoglobin</h3>
        <p className="mt-1 text-slate-600">{hb.map((item) => item.value).join(" → ")}</p>
        <Link className="mt-2 inline-flex text-indigo-700" href="/doctor/reports/rpt-cbc?finding=f-hb">
          View evidence · CBC_Report.pdf · Page 1 · Line 8
        </Link>
      </section>
    </div>
  );
}
