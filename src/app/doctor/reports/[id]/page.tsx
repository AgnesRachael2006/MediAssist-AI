"use client";

import { use, useState } from "react";
import { PatientExplanation } from "@/components/patient/PatientExplanation";
import { AIInsightCard } from "@/components/ai/AIInsightCard";
import { EvidenceCard } from "@/components/ai/EvidenceCard";
import { CrossCheck } from "@/components/ai/CrossCheck";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { formatDate, formatDateTime } from "@/lib/format";
import { DEMO_DOCTOR, buildPatientExplanation, getPatientById } from "@/lib/mockData";
import { submitDoctorReview } from "@/lib/api";
import { useDemoStore } from "@/lib/useDemoStore";
import { useToast } from "@/components/ui/Toast";
import { isDoctorReviewed } from "@/lib/types";

export default function DoctorReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { reports, insights, reviews, auditLogs } = useDemoStore();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);

  const report = reports.find((item) => item.id === id);
  const insight = insights.find((item) => item.reportId === id) ?? null;
  const review = reviews.filter((item) => item.reportId === id).at(-1) ?? null;
  const logs = auditLogs.filter((item) => item.reportId === id);
  const patient = report ? getPatientById(report.patientId) : undefined;
  const approved = report ? isDoctorReviewed(report.doctorReviewStatus) : false;
  const explanation = report && approved ? buildPatientExplanation(report, review) : null;

  if (!report) {
    return (
      <ErrorState
        title="Unable to load report."
        description="This demo report id is not in the workspace. Please try again."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Patient Name</p>
            <p className="text-lg font-semibold text-slate-900">{patient?.name}</p>
            <p className="text-sm text-slate-500">
              {patient?.age} · {patient?.sex} · {patient?.mrn}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Report Name</p>
            <p className="font-medium text-slate-900">{report.title}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Date</p>
            <p className="font-medium text-slate-900">{formatDate(report.uploadedAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <StatusBadge kind="processing" value={report.processingStatus} />
              <StatusBadge kind="review" value={report.doctorReviewStatus} />
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-amber-800">Demo / Synthetic Data</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Original Report</h2>
            <span className="text-[11px] font-medium text-amber-800">Demo / Synthetic Data</span>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {report.labValues.map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{row.label}</p>
                  <p className="text-xs text-slate-500">Ref: {row.referenceRange}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {row.value} {row.unit}
                  </p>
                  {row.flag === "attention" ? (
                    <p className="text-xs text-amber-700">Outside or near listed range</p>
                  ) : (
                    <p className="text-xs text-emerald-700">Within provided range</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">{report.notes}</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">AI Clinical Insight</h2>
          {report.processingStatus === "processing" ? (
            <div className="mt-4">
              <LoadingState label="Analyzing report..." />
            </div>
          ) : insight ? (
            <div className="mt-4 space-y-4">
              <AIInsightCard insight={insight} />
              <EvidenceCard insight={insight} />
            </div>
          ) : (
            <ErrorState description="No AI insight is available for this report." />
          )}
        </section>
      </div>

      {insight ? (
        <CrossCheck
          insight={insight}
          review={review}
          onDecision={async (input) => {
            setSaving(true);
            await submitDoctorReview({
              reportId: report.id,
              insightId: insight.id,
              ...input,
            });
            setSaving(false);
            notify("Decision recorded successfully.");
          }}
        />
      ) : null}

      {saving ? <LoadingState label="Recording decision..." /> : null}

      {review ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Latest audit entry</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Doctor</dt>
              <dd className="font-medium">{DEMO_DOCTOR.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Action</dt>
              <dd className="font-medium">
                {review.status === "accepted"
                  ? "Approved by Doctor"
                  : review.status === "modified"
                    ? "Modified by Doctor"
                    : "Rejected by Doctor"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Time</dt>
              <dd className="font-medium">{formatDateTime(review.recordedAt)}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {explanation ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Patient explanation preview — only this approved text is shared
          </p>
          <PatientExplanation explanation={explanation} listen={false} />
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Audit Trail</h2>
        <AuditTimeline logs={logs} />
      </section>
    </div>
  );
}
