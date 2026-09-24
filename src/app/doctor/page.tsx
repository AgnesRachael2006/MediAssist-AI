"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClinicalTimeline } from "@/components/triadic/ClinicalTimeline";
import { SystemStatus } from "@/components/triadic/SystemStatus";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { getDoctorDashboard, getMedicationSafety, getSystemStatus, resetDemo } from "@/lib/api";
import { formatDateTime, greeting } from "@/lib/format";
import { useDemoStore } from "@/lib/useDemoStore";
import type { DoctorDashboardData, MedicationSafetyRow, SystemHealth } from "@/lib/types";

export default function DoctorDashboardPage() {
  const store = useDemoStore();
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [system, setSystem] = useState<SystemHealth | null>(null);
  const [safety, setSafety] = useState<MedicationSafetyRow[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDoctorDashboard(), getSystemStatus(), getMedicationSafety("patient-arun")])
      .then(([dashboard, health, checks]) => {
        if (cancelled) return;
        setData(dashboard);
        setSystem(health);
        setSafety(checks);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [store.findings, store.reports, store.system, store.safetyChecks]);

  if (error) return <ErrorState title="Unable to load the queue." description="Please try again." />;
  if (!data || !system) return <LoadingState label="Loading the clinical command center..." />;

  const alerts = safety.filter((item) => item.status !== "clear" && item.doctor_decision === "pending");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Clinical Command Center</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          {greeting()}, {data.greeting_name}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Gemini writes. Jev referees. Evidence is pinned. Code enforces. The doctor signs.
        </p>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Review overview</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat value={data.rows_extracted} label="Findings extracted" />
          <Stat value={data.review_needed} label="Need review" />
          <Stat value={data.routine_normal} label="Routine" />
          <Stat value={data.insufficient} label="Insufficient" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Requires your attention</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {data.attention.map((finding) => (
            <Link
              key={finding.id}
              href={`/doctor/reports/${finding.report_id}?finding=${finding.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-200"
            >
              <p className="font-semibold text-slate-900">{finding.test_name}</p>
              <p className="mt-1 text-sm text-slate-700">
                {finding.value} {finding.unit}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-amber-800">
                {finding.jev.triage.replaceAll("_", " ")}
              </p>
              <p className="text-xs text-slate-500">Evidence: {finding.jev.evidence}</p>
              {finding.jev.overclaim ? <p className="mt-2 text-xs font-medium text-red-700">Possible overclaim</p> : null}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Patient safety gate</h3>
        <p className="mt-1 text-sm text-slate-600">Unapproved medical language is blocked from patient view.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat value={data.review_needed} label="AI findings in review" />
          <Stat value={data.approved} label="Doctor approved" />
          <Stat value={data.pending} label="Pending review" />
          <Stat value={data.rejected} label="Rejected" />
          <Stat value={data.patient_visible} label="Patient visible" />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent reports</h3>
        {data.queue.length === 0 ? (
          <EmptyState title="No reports in the queue." description="Load the synthetic CBC report to start the demo." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Report</th>
                  <th className="px-4 py-3">Review count</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {data.queue.map((row) => (
                  <tr key={row.report_id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{row.patient_name}</td>
                    <td className="px-4 py-3">
                      <Link className="font-medium text-indigo-700" href={`/doctor/reports/${row.report_id}`}>
                        {row.report_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.review_count}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(row.uploaded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ClinicalTimeline visits={store.visits} observations={store.observations} />

      <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <h3 className="text-sm font-semibold text-amber-950">Medication safety alerts</h3>
        {alerts.length === 0 ? (
          <p className="mt-2 text-sm text-amber-900">No pending curated warnings.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm text-amber-950">
            {alerts.map((item) => (
              <li key={item.id}>
                {item.medication} · {item.interaction} · {item.status.replaceAll("_", " ")}
              </li>
            ))}
          </ul>
        )}
        <Link href="/doctor/medication-safety" className="mt-3 inline-flex text-sm font-medium text-indigo-800">
          Open medication safety
        </Link>
      </section>

      <SystemStatus status={system} />
      <Button variant="secondary" onClick={() => resetDemo()}>
        Reset demo data
      </Button>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
