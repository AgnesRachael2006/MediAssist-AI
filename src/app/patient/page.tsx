"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Info,
  Play,
  ShieldCheck,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";
import { isDoctorReviewed } from "@/lib/types";

export default function PatientHomePage() {
  const { reports, notifications } = useDemoStore();
  const { name, patientId } = usePatientSession();

  const mine = reports
    .filter((report) => report.patientId === patientId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  const latest = mine[0];
  const reviewed = mine.filter((report) => isDoctorReviewed(report.doctorReviewStatus));
  const pending = mine.filter((report) => report.doctorReviewStatus === "pending");
  const latestReviewed = latest ? isDoctorReviewed(latest.doctorReviewStatus) : false;
  const listenTarget = latestReviewed ? latest : reviewed[0];
  const updates = notifications
    .filter((item) => item.audience === "patient" && (!item.patientId || item.patientId === patientId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const headline = updates.find((item) => item.tone === "success") ?? updates[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Hello, {name}</h1>
        <p className="mt-1 text-base text-slate-600">
          Understand your health reports in simple language.
        </p>
      </div>

      {headline ? (
        <Link
          href={headline.href ?? "/patient/reports"}
          className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-950"
        >
          {headline.tone === "info" ? <Info size={18} /> : <CheckCircle2 size={18} />}
          <span>
            <span className="block text-sm font-semibold">
              {headline.tone === "info" ? "ℹ" : "✓"} {headline.title}
            </span>
            <span className="mt-1 block text-sm">{headline.body}</span>
          </span>
        </Link>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Latest Report"
          value={latest?.title ?? "None"}
          hint={latest ? formatDate(latest.uploadedAt) : "No previous reports available."}
          icon={FileText}
        />
        <StatCard label="Reports Available" value={mine.length} icon={FileText} />
        <StatCard label="Doctor Reviewed" value={reviewed.length} icon={CheckCircle2} />
        <StatCard label="Pending Review" value={pending.length} icon={Clock3} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Latest Report
        </h2>
        {!latest ? (
          <EmptyState
            title="No previous reports available."
            description="Upload another report to compare results over time, or wait for your clinic to share one."
          />
        ) : (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-lg font-semibold text-slate-900">{latest.title}</p>
            <p className="text-base text-slate-500">{formatDate(latest.uploadedAt)}</p>
            <p className={`mt-3 text-base font-medium ${latestReviewed ? "text-emerald-700" : "text-amber-800"}`}>
              {latestReviewed ? "✓ Doctor Reviewed" : "Pending Doctor Review"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {latestReviewed
                ? "Information shown here has been reviewed by your doctor."
                : "An explanation will appear after your doctor reviews this report. Unapproved AI notes stay with your clinician."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={latestReviewed ? `/patient/reports/${latest.id}` : "/patient/reports"}
                className="inline-flex min-h-12 items-center rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white"
              >
                View Report
              </Link>
            </div>
          </article>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Listen to Report</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Hear a simple explanation of a doctor-reviewed report. The same words are available to read.
        </p>
        {listenTarget ? (
          <Link
            href={`/patient/report-voice?report=${listenTarget.id}`}
            className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800"
          >
            <Play size={16} aria-hidden /> Play Summary
          </Link>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No doctor-reviewed report is ready to play yet.</p>
        )}
      </section>

      {updates.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Updates</h2>
          <ul className="mt-3 space-y-3">
            {updates.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link href={item.href ?? "/patient/reports"} className="block text-sm leading-6 text-slate-700">
                  <span className="font-medium text-slate-900">
                    {item.tone === "info" ? "ℹ" : "✓"} {item.title}
                  </span>
                  <span className="mt-0.5 block text-slate-500">{item.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/patient/ask" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-base font-semibold text-slate-900">Ask MediAssist</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Ask what a medical term or test means. This assistant explains. It does not diagnose.
          </p>
        </Link>
        <Link href="/patient/doctor-reviews" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShieldCheck className="text-emerald-700" size={18} />
          <p className="mt-2 text-base font-semibold text-slate-900">Doctor Reviews</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">See which reports your doctor has reviewed.</p>
        </Link>
      </section>
    </div>
  );
}
