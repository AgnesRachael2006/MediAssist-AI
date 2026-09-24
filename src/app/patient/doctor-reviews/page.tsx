"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { DEMO_DOCTOR } from "@/lib/mockData";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";
import { isDoctorReviewed } from "@/lib/types";
import { doctorName } from "@/lib/api";
import Link from "next/link";

export default function DoctorReviewsPage() {
  const { reports, reviews } = useDemoStore();
  const { patientId } = usePatientSession();
  const mine = reports.filter(
    (report) => report.patientId === patientId && isDoctorReviewed(report.doctorReviewStatus),
  );

  if (mine.length === 0) {
    return (
      <EmptyState
        title="No doctor-reviewed reports yet."
        description="Unapproved AI findings are not shown to patients."
      />
    );
  }

  return (
    <div className="space-y-3">
      {mine.map((report) => {
        const review = reviews.filter((item) => item.reportId === report.id).at(-1);
        return (
          <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Doctor Review Status
            </p>
            <p className="mt-2 text-sm text-slate-500">Doctor</p>
            <p className="font-semibold text-slate-900">
              {doctorName(report.doctorId) || DEMO_DOCTOR.name}
            </p>
            <p className="mt-2 text-sm text-slate-500">Report</p>
            <p className="font-medium text-slate-900">{report.title}</p>
            <p className="text-sm text-slate-500">{formatDate(report.uploadedAt)}</p>
            <p className="mt-3 text-sm font-medium text-emerald-700">✓ Reviewed</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your doctor has reviewed the AI-assisted report analysis.
              {review?.decisionNote ? ` ${review.decisionNote}` : ""}
            </p>
            <Link
              href={`/patient/reports/${report.id}`}
              className="mt-4 inline-flex text-sm font-medium text-indigo-700"
            >
              Open explanation
            </Link>
          </article>
        );
      })}
    </div>
  );
}
