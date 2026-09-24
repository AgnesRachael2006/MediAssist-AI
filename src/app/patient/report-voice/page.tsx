"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReportVoicePlayer } from "@/components/patient/ReportVoicePlayer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { doctorName, getReportExplanation } from "@/lib/api";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";
import { isDoctorReviewed, type PatientExplanation } from "@/lib/types";

function VoiceInner() {
  const params = useSearchParams();
  const { patientId } = usePatientSession();
  const { reports } = useDemoStore();
  const mine = reports
    .filter((report) => report.patientId === patientId && isDoctorReviewed(report.doctorReviewStatus))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  const selected = mine.find((report) => report.id === params.get("report")) ?? mine[0];
  const selectedId = selected?.id;
  const [explanation, setExplanation] = useState<PatientExplanation | null>(null);
  const [failed, setFailed] = useState(false);
  const [trackedId, setTrackedId] = useState(selectedId);
  if (trackedId !== selectedId) {
    setTrackedId(selectedId);
    setExplanation(null);
    setFailed(false);
  }

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    getReportExplanation(selectedId)
      .then((value) => {
        if (cancelled) return;
        if (!value) setFailed(true);
        else setExplanation(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (!selected) {
    return (
      <EmptyState
        title="No doctor-reviewed report yet."
        description="Voice explanation is available after your doctor reviews a report."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Report Voice Assistant</h1>
        <p className="mt-1 text-base text-slate-600">
          Listen to a simple explanation of your doctor-reviewed report.
        </p>
      </div>

      {mine.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a reviewed report">
          {mine.map((report) => (
            <Link
              key={report.id}
              href={`/patient/report-voice?report=${report.id}`}
              className={`rounded-full px-3 py-2 text-sm ${
                report.id === selected.id
                  ? "bg-indigo-700 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {report.title} · {formatDate(report.uploadedAt)}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Report Name</p>
        <p className="text-lg font-semibold text-slate-900">{selected.title}</p>
        <p className="mt-2 text-sm text-slate-500">Date</p>
        <p className="text-base text-slate-800">{formatDate(selected.uploadedAt)}</p>
        <p className="mt-2 text-sm text-slate-500">Doctor Review Status</p>
        <p className="text-base font-medium text-emerald-700">✓ Doctor Reviewed</p>
        <p className="mt-1 text-sm text-slate-500">Reviewed by {doctorName(selected.doctorId)}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Information shown here has been reviewed by your doctor.
        </p>
      </div>

      {selected && !explanation && !failed ? <LoadingState label="Generating explanation..." /> : null}
      {failed ? <ErrorState title="Unable to load report." description="Please try again." /> : null}
      {explanation ? <ReportVoicePlayer text={explanation.voiceScript} /> : null}

      <p className="text-sm text-slate-500">
        Have a question about a term?{" "}
        <Link href={`/patient/ask?report=${selected.id}`} className="font-medium text-indigo-700">
          Ask MediAssist
        </Link>
      </p>
    </div>
  );
}

export default function ReportVoicePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading report..." />}>
      <VoiceInner />
    </Suspense>
  );
}
