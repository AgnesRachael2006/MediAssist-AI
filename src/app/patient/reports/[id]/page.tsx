"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { ReportVoicePlayer } from "@/components/patient/ReportVoicePlayer";
import { formatDate } from "@/lib/format";
import { getReportExplanation, markExplanationViewed } from "@/lib/api";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";
import { isDoctorReviewed, type PatientExplanation } from "@/lib/types";

function Expand({ title, body }: { title: string; body: string }) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4" open>
      <summary className="cursor-pointer text-base font-semibold text-slate-900">{title}</summary>
      <p className="mt-2 text-base leading-7 text-slate-600">{body}</p>
    </details>
  );
}

export default function PatientReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { patientId } = usePatientSession();
  const { reports } = useDemoStore();
  const report = reports.find((item) => item.id === id && item.patientId === patientId);
  const approved = report ? isDoctorReviewed(report.doctorReviewStatus) : false;
  const reportId = report?.id;
  const [explanation, setExplanation] = useState<PatientExplanation | null>(null);
  const [failed, setFailed] = useState(false);
  const [trackedId, setTrackedId] = useState(reportId);
  if (trackedId !== reportId) {
    setTrackedId(reportId);
    setExplanation(null);
    setFailed(false);
  }

  useEffect(() => {
    if (!reportId || !approved) return;
    let cancelled = false;
    getReportExplanation(reportId)
      .then((value) => {
        if (cancelled) return;
        if (!value) setFailed(true);
        else setExplanation(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    markExplanationViewed(reportId);
    return () => {
      cancelled = true;
    };
  }, [reportId, approved]);

  if (!report) {
    return (
      <ErrorState
        title="Unable to load report."
        description="This report is not available in the patient view. Please try again."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{report.title}</h1>
        <p className="text-base text-slate-500">{formatDate(report.uploadedAt)}</p>
        <p className={`mt-2 text-base font-medium ${approved ? "text-emerald-700" : "text-amber-800"}`}>
          {approved ? "✓ Doctor Reviewed" : "Pending Doctor Review"}
        </p>
      </div>

      {!approved ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-base leading-7 text-amber-950">
          Only doctor-approved information is shown here. Your clinician is still reviewing this
          report. Raw AI notes are not shown as a diagnosis.
        </div>
      ) : !explanation && !failed ? (
        <LoadingState label="Generating explanation..." />
      ) : failed || !explanation ? (
        <ErrorState title="Unable to load report." description="Please try again." />
      ) : (
        <>
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-900">
            ✓ Doctor Reviewed. Information shown here has been reviewed by your doctor.
          </p>
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Your Report Explained Simply</h2>
            <p className="text-base leading-7 text-slate-700">{explanation.summary}</p>
          </section>
          <div className="space-y-2">
            <Expand title="What was checked?" body={explanation.whatWasChecked} />
            <Expand title="What do the results mean?" body={explanation.whatWasFound} />
            <Expand title="What did the doctor review?" body={explanation.whatDoctorReviewed} />
            <Expand title="What should you discuss with your doctor?" body={explanation.whatToDiscuss} />
          </div>
          <div>
            <p className="mb-2 text-base font-semibold text-slate-900">Listen to this explanation</p>
            <ReportVoicePlayer text={explanation.voiceScript} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-base font-semibold text-slate-900">Ask about this report</p>
            <p className="mt-1 text-sm text-slate-500">
              Questions stay educational. MediAssist will not diagnose or prescribe.
            </p>
            <Link
              href={`/patient/ask?report=${report.id}`}
              className="mt-3 inline-flex min-h-12 items-center rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white"
            >
              Ask MediAssist
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
