"use client";

import Link from "next/link";
import { toApprovedExplanation } from "@/lib/policy";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";
import { getDoctorById } from "@/lib/mockData";
import { formatDateTime } from "@/lib/format";

export default function PatientHomePage() {
  const { name, patientId } = usePatientSession();
  const { reports, findings } = useDemoStore();
  const mine = reports.filter(
    (report) => report.patientId === patientId && findings.some((finding) => finding.report_id === report.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Hello, {name}</h1>
        <p className="mt-1 text-base text-slate-600">Your reports show only what your doctor approved.</p>
      </div>
      <div className="space-y-3">
        {mine.map((report) => {
          const doctor = getDoctorById(report.doctorId);
          const explanation = toApprovedExplanation(
            report.id,
            report.title,
            doctor?.name ?? "your doctor",
            findings,
          );
          return (
            <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">{report.title}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {explanation ? `Reviewed by ${explanation.doctor_name}` : "Waiting for doctor review"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {explanation?.reviewed_at
                  ? `Last reviewed ${formatDateTime(explanation.reviewed_at)}`
                  : "No approved note yet"}
              </p>
              <p className={`mt-3 text-sm font-medium ${explanation ? "text-emerald-700" : "text-amber-800"}`}>
                {explanation ? "✓ Doctor reviewed" : "Pending doctor review"}
              </p>
              {explanation ? (
                <Link
                  href={`/patient/reports/${report.id}`}
                  className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-indigo-700 px-4 text-sm font-medium text-white"
                >
                  Understand My Report
                </Link>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Raw AI drafts stay with your doctor until they approve the wording.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
