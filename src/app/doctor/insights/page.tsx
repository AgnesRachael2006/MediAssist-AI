"use client";

import Link from "next/link";
import { AIInsightCard } from "@/components/ai/AIInsightCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { patientName } from "@/lib/api";
import { useDemoStore } from "@/lib/useDemoStore";

export default function InsightsPage() {
  const { insights, reports } = useDemoStore();

  if (insights.length === 0) {
    return (
      <EmptyState
        title="No AI insights"
        description="Upload a report to generate clinical insights for review."
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {insights.map((insight) => {
        const report = reports.find((item) => item.id === insight.reportId);
        return (
          <div key={insight.id} className="space-y-2">
            <AIInsightCard insight={insight} />
            {report ? (
              <p className="px-1 text-xs text-slate-500">
                {patientName(report.patientId)} · {report.title} ·{" "}
                <Link className="text-indigo-700 hover:underline" href={`/doctor/reports/${report.id}`}>
                  Open review
                </Link>
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
