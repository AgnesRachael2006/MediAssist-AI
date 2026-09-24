"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { patientName } from "@/lib/api";
import { relativeDay } from "@/lib/format";
import type { MedicalReport } from "@/lib/types";

export function ReportTable({
  reports,
  actionHref,
}: {
  reports: MedicalReport[];
  actionHref: (id: string) => string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Report</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3">Processing Status</th>
              <th className="px-4 py-3">Doctor Review</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {patientName(report.patientId)}
                </td>
                <td className="px-4 py-3 text-slate-700">{report.title}</td>
                <td className="px-4 py-3 text-slate-500">{relativeDay(report.uploadedAt)}</td>
                <td className="px-4 py-3">
                  <StatusBadge kind="processing" value={report.processingStatus} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge kind="review" value={report.doctorReviewStatus} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={actionHref(report.id)}
                    className="font-medium text-indigo-700 hover:underline"
                  >
                    {report.doctorReviewStatus === "pending" ? "Review" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReportCard({
  report,
  href,
}: {
  report: MedicalReport;
  href: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{report.title}</p>
          <p className="text-xs text-slate-500">{patientName(report.patientId)}</p>
        </div>
        <StatusBadge kind="review" value={report.doctorReviewStatus} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge kind="processing" value={report.processingStatus} />
        <Link href={href} className="text-sm font-medium text-indigo-700 hover:underline">
          {report.doctorReviewStatus === "pending" ? "Review" : "View"}
        </Link>
      </div>
    </article>
  );
}
