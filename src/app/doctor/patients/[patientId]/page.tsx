"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { createRecommendation, getHealthVault, publishReportSummary } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { getPatientById } from "@/lib/mockData";
import { useDemoStore } from "@/lib/useDemoStore";

export default function DoctorPatientPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const state = useDemoStore();
  const [vault, setVault] = useState<Awaited<ReturnType<typeof getHealthVault>> | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getHealthVault(patientId)
      .then(setVault)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Forbidden"));
  }, [patientId, state.findings, state.shares]);

  if (error) return <ErrorState title="This record is not available." description={error} />;
  if (!vault) return <LoadingState label="Loading the health record..." />;

  const trends = vault.trends;
  const quality = vault.quality;
  const pending = Array.isArray(vault.findings)
    ? vault.findings.filter((item) => "doctor_decision" in item && item.doctor_decision === "pending").length
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Patient health record</p>
        <h2 className="text-2xl font-semibold text-slate-900">{getPatientById(patientId)?.name ?? "Patient"}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Reports {vault.reports.length} · Visits {vault.visits.length} · Pending review {pending}
          {trends.find((item) => item.metric === "Hemoglobin" && item.delta < 0) ? " · Hb down" : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-800" href={`/doctor/patients/${patientId}/timeline`}>Timeline</Link>
        <Link className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-800" href={`/doctor/patients/${patientId}/knowledge-graph`}>Knowledge graph</Link>
        <Link className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-800" href={`/doctor/patients/${patientId}/handoff`}>Handoff</Link>
        <Link className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-800" href="/doctor/reports/rpt-cbc?finding=f-hb">View evidence</Link>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Record quality</h3>
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          {quality
            ? [...quality.conflicts, ...quality.missing_information, ...quality.incomplete_trends].map((item, index) => (
                <li key={`${item.code}-${index}`}>⚠ {item.title}. {item.detail}</li>
              ))
            : null}
        </ul>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <h3 className="font-semibold text-slate-900">Publish and follow-up</h3>
        <p className="mt-1 text-slate-600">A summary reaches Agnes only after you publish it. A follow-up note is the sentence she can book from.</p>
        {notice ? <p className="mt-2 text-slate-700">{notice}</p> : null}
        <div className="mt-3 space-y-2">
          {vault.reports.map((report) => (
            <div key={report.id} className="flex flex-wrap items-center justify-between gap-2">
              <p>{report.title}{report.summary_published ? " · published" : ""}</p>
              <Button type="button" variant="secondary" onClick={() => void publishReportSummary(report.id).then(() => setNotice("Summary published for the patient.")).catch((caught) => setNotice(caught instanceof Error ? caught.message : "Unable to publish."))}>
                Publish summary
              </Button>
            </div>
          ))}
        </div>
        <Button className="mt-3" type="button" onClick={() => void createRecommendation(patientId, "Your doctor recommends a follow-up consultation.", "General Medicine").then(() => setNotice("Follow-up published.")).catch((caught) => setNotice(caught instanceof Error ? caught.message : "Unable to publish the follow-up."))}>
          Publish follow-up
        </Button>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <h3 className="font-semibold text-slate-900">Hemoglobin series</h3>
        <p className="mt-1 text-slate-600">
          {trends.find((item) => item.metric === "Hemoglobin")?.points.map((point) => point.value).join(" → ") ?? "No dated series"}
        </p>
      </section>
    </div>
  );
}

