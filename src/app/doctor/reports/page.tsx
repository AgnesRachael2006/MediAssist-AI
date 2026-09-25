"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UploadDropzone } from "@/components/reports/UploadDropzone";
import { ErrorState } from "@/components/ui/EmptyState";
import { analyzeReport, getReports, loadCbcDemo, patientName, uploadDocument } from "@/lib/api";
import { CBC_REPORT_ID } from "@/lib/cbcDemo";
import { useDemoStore } from "@/lib/useDemoStore";
import { formatDateTime } from "@/lib/format";
import type { MedicalReport } from "@/lib/types";

export default function DoctorReportsPage() {
  const { reports, findings } = useDemoStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("Uploading");
  const [error, setError] = useState("");
  const [liveReports, setLiveReports] = useState<MedicalReport[] | null>(null);
  const live = process.env.NEXT_PUBLIC_API_MODE === "live";
  const queue = reports.filter((report) => findings.some((finding) => finding.report_id === report.id));
  const shown = liveReports ?? (queue.length ? queue : reports.filter((report) => report.id === CBC_REPORT_ID));

  useEffect(() => {
    if (!live) return;
    getReports()
      .then(setLiveReports)
      .catch(() => setLiveReports([]));
  }, [live, busy]);

  async function openFile(file: File) {
    setBusy(true);
    setError("");
    try {
      setPhase("Uploading");
      const report = await uploadDocument(file);
      setPhase("Extracting");
      setPhase("Analyzing");
      await analyzeReport(report.id);
      router.push(`/doctor/reports/${report.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to read this PDF.");
      setBusy(false);
    }
  }

  async function openDemo() {
    setBusy(true);
    setError("");
    try {
      setPhase("Uploading");
      await new Promise((resolve) => setTimeout(resolve, 350));
      setPhase("Extracting");
      await new Promise((resolve) => setTimeout(resolve, 350));
      setPhase("Analyzing");
      const report = await loadCbcDemo();
      router.push(`/doctor/reports/${report.id}`);
    } catch {
      setError("Unable to load report. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <UploadDropzone
        busy={busy}
        phase={phase}
        onUpload={(file) => void openFile(file)}
        onDemo={() => (live ? router.push("/doctor/reports/rpt-cbc") : void openDemo())}
        onInvalid={() => setError("Please choose a PDF.")}
      />
      {error ? <ErrorState title="Unable to load report." description={error} /> : null}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Recent reports</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Report</th>
              <th className="px-4 py-3">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((report) => (
              <tr key={report.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{patientName(report.patientId)}</td>
                <td className="px-4 py-3">
                  <Link className="font-medium text-indigo-700" href={`/doctor/reports/${report.id}`}>
                    {report.fileName ?? report.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(report.uploadedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
