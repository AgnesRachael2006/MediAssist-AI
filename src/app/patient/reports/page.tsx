"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";
import { isDoctorReviewed } from "@/lib/types";
import { analyzeReport, uploadReport } from "@/lib/api";
import { UploadDropzone } from "@/components/reports/UploadDropzone";
import { useToast } from "@/components/ui/Toast";

export default function PatientReportsPage() {
  const { reports } = useDemoStore();
  const { patientId } = usePatientSession();
  const { notify } = useToast();
  const mine = reports
    .filter((report) => report.patientId === patientId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  const [status, setStatus] = useState<"idle" | "uploading" | "extracting" | "analyzing" | "error">("idle");

  async function handleUpload(fileName: string) {
    try {
      setStatus("uploading");
      await new Promise((resolve) => setTimeout(resolve, 350));
      setStatus("extracting");
      const report = await uploadReport(fileName, patientId);
      setStatus("analyzing");
      await analyzeReport(report.id);
      notify("Report uploaded. Your doctor will review it.");
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-6">
      <UploadDropzone
        busy={status !== "idle" && status !== "error"}
        onUpload={handleUpload}
        onDemo={() => handleUpload("Demo-CBC-Arun-Kumar.pdf")}
        onInvalid={() => setStatus("error")}
      />
      {status === "uploading" ? <LoadingState label="Uploading..." /> : null}
      {status === "extracting" ? <LoadingState label="Extracting report..." /> : null}
      {status === "analyzing" ? <LoadingState label="Analyzing report..." /> : null}
      {status === "error" ? (
        <ErrorState title="Unable to load report." description="Please try again with a PDF or the demo report." />
      ) : null}

      {mine.length === 0 ? (
        <EmptyState title="No previous reports available." description="Upload a demo report to begin." />
      ) : (
        <div className="space-y-3">
          {mine.map((report) => {
            const reviewed = isDoctorReviewed(report.doctorReviewStatus);
            return (
              <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-medium text-slate-900">{report.title}</p>
                <p className="text-sm text-slate-500">{formatDate(report.uploadedAt)}</p>
                <p className={`mt-2 text-sm ${reviewed ? "text-emerald-700" : "text-amber-800"}`}>
                  {reviewed ? "✓ Doctor Reviewed" : "Pending Review"}
                </p>
                {reviewed ? (
                  <Link
                    href={`/patient/reports/${report.id}`}
                    className="mt-3 inline-block text-sm font-medium text-indigo-700"
                  >
                    View explanation
                  </Link>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Only doctor-reviewed information is shown in the patient explanation.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
