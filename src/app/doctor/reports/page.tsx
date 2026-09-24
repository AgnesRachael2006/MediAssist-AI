"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { loadCbcDemo } from "@/lib/api";
import { CBC_REPORT_ID } from "@/lib/cbcDemo";
import { useDemoStore } from "@/lib/useDemoStore";
import { formatDateTime } from "@/lib/format";
import { patientName } from "@/lib/api";

export default function DoctorReportsPage() {
  const { reports, findings } = useDemoStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const queue = reports.filter((report) => findings.some((finding) => finding.report_id === report.id));

  async function openDemo() {
    setBusy(true);
    setError(false);
    try {
      const report = await loadCbcDemo();
      router.push(`/doctor/reports/${report.id}`);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Reports</h2>
        <p className="mt-1 text-sm text-slate-500">
          The demo uses a synthetic extract of CBC_Report.pdf. The file is not sent to a server.
        </p>
      </div>
      <Button disabled={busy} onClick={openDemo}>Load Demo Report</Button>
      {busy ? <LoadingState label="Preparing the synthetic CBC extract..." /> : null}
      {error ? <ErrorState title="Unable to load report." description="Please try again." /> : null}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Report</th>
              <th className="px-4 py-3">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {(queue.length ? queue : reports.filter((report) => report.id === CBC_REPORT_ID)).map((report) => (
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
