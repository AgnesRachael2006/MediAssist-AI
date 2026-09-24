"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  FileSearch,
  Sparkles,
  Users,
} from "lucide-react";
import { WorkflowStrip } from "@/components/dashboard/WorkflowStrip";
import { StatCard } from "@/components/ui/StatCard";
import { ReportTable } from "@/components/reports/ReportTable";
import { AIInsightCard } from "@/components/ai/AIInsightCard";
import { CrossCheck } from "@/components/ai/CrossCheck";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { greeting } from "@/lib/format";
import { useDemoStore } from "@/lib/useDemoStore";
import { getSession } from "@/lib/session";
import { submitDoctorReview } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useEffect, useState } from "react";

export default function DoctorDashboardPage() {
  const { reports, insights, reviews, auditLogs } = useDemoStore();
  const awaiting = reports.filter((report) => report.doctorReviewStatus === "pending");
  const featured = reports.find((report) => report.id === "rpt-001") ?? awaiting[0];
  const pendingInsight = featured
    ? insights.find((insight) => insight.reportId === featured.id)
    : insights[0];
  const featuredReview = featured
    ? reviews.filter((item) => item.reportId === featured.id).at(-1) ?? null
    : null;
  const { notify } = useToast();
  const [doctorName, setDoctorName] = useState("Dr. Wilson");

  useEffect(() => {
    const session = getSession();
    if (!session?.name) return;
    const nextName = session.name.includes("Wilson")
      ? "Dr. Wilson"
      : session.name.startsWith("Dr.")
        ? session.name
        : `Dr. ${session.name}`;
    queueMicrotask(() => setDoctorName(nextName));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          {greeting()}, {doctorName}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Review patient reports and AI-assisted clinical insights.
        </p>
        <Link
          href="/doctor/reports"
          className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          Upload or use a demo report
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Patients Today" value={8} hint="Synthetic clinic volume" icon={Users} />
        <StatCard
          label="Reports Awaiting Review"
          value={awaiting.length}
          icon={FileSearch}
        />
        <StatCard label="AI Insights" value={insights.length} icon={Sparkles} />
        <StatCard
          label="Pending Decisions"
          value={awaiting.length}
          icon={ClipboardCheck}
        />
      </div>

      <WorkflowStrip />

      {pendingInsight ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">AI ↔ Doctor Cross-Check</h3>
            {featured ? (
              <Link
                href={`/doctor/reports/${featured.id}`}
                className="text-sm font-medium text-indigo-700 hover:underline"
              >
                Open full workspace
              </Link>
            ) : null}
          </div>
          <CrossCheck
            insight={pendingInsight}
            review={featuredReview}
            onDecision={
              featured
                ? async (input) => {
                    await submitDoctorReview({
                      reportId: featured.id,
                      insightId: pendingInsight.id,
                      ...input,
                    });
                    notify("Decision recorded successfully.");
                  }
                : undefined
            }
          />
        </div>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Reports Awaiting Review</h3>
          <Link href="/doctor/reports" className="text-sm font-medium text-indigo-700 hover:underline">
            Open reports
          </Link>
        </div>
        {awaiting.length === 0 ? (
          <EmptyState title="No reports awaiting review" description="New uploads will appear here." />
        ) : (
          <ReportTable reports={awaiting} actionHref={(id) => `/doctor/reports/${id}`} />
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent AI Insights</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          {insights.slice(0, 3).map((insight) => (
            <AIInsightCard key={insight.id} insight={insight} compact />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Recent Activity</h3>
        <AuditTimeline
          logs={[...auditLogs]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 6)
            .reverse()}
        />
      </section>
    </div>
  );
}
