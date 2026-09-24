"use client";

import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";

export default function TimelinePage() {
  const { reports, auditLogs } = useDemoStore();
  const { patientId } = usePatientSession();
  const ids = new Set(
    reports.filter((report) => report.patientId === patientId).map((report) => report.id),
  );
  const logs = auditLogs
    .filter((log) => ids.has(log.reportId))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (logs.length === 0) {
    return (
      <EmptyState
        title="No timeline events yet."
        description="Upload and review activity will appear here."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-base leading-7 text-slate-600">
        This timeline shows how a report moved from upload to a doctor-reviewed explanation.
      </p>
      <AuditTimeline logs={logs} size="lg" />
    </div>
  );
}
