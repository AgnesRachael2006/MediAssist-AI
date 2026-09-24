"use client";

import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDemoStore } from "@/lib/useDemoStore";

export default function AuditPage() {
  const { auditLogs } = useDemoStore();
  const logs = [...auditLogs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  if (logs.length === 0) {
    return <EmptyState title="No audit events" description="Actions you take will appear here." />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Events include report upload, AI analysis, clinician review, patient explanation, and
        medication safety decisions.
      </p>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <AuditTimeline logs={logs} />
      </div>
    </div>
  );
}
