"use client";

import Link from "next/link";
import { toApprovedExplanation } from "@/lib/policy";
import { formatDate } from "@/lib/format";
import { getDoctorById } from "@/lib/mockData";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PatientReportsPage() {
  const { patientId } = usePatientSession();
  const { reports, findings } = useDemoStore();
  const mine = reports.filter(
    (report) => report.patientId === patientId && findings.some((finding) => finding.report_id === report.id),
  );

  if (mine.length === 0) {
    return <EmptyState title="No reports yet." description="Your clinic has not shared a report." />;
  }

  return (
    <div className="space-y-3">
      {mine.map((report) => {
        const explanation = toApprovedExplanation(
          report.id,
          report.title,
          getDoctorById(report.doctorId)?.name ?? "your doctor",
          findings,
        );
        return (
          <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-900">{report.title}</p>
            <p className="text-sm text-slate-500">{formatDate(report.uploadedAt)}</p>
            <p className={`mt-2 text-sm ${explanation ? "text-emerald-700" : "text-amber-800"}`}>
              {explanation ? "✓ Doctor reviewed" : "Pending doctor review"}
            </p>
            {explanation ? (
              <Link href={`/patient/reports/${report.id}`} className="mt-3 inline-block text-sm font-medium text-indigo-700">
                Understand My Report
              </Link>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
