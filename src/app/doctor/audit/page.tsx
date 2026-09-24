"use client";

import { AuditEventList } from "@/components/triadic/AuditEvent";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDemoStore } from "@/lib/useDemoStore";

export default function AuditPage() {
  const { triadicEvents } = useDemoStore();
  const events = [...triadicEvents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Report Audit Trail</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gemini drafts, Jev triages, and the doctor’s accept, edit, and reject decisions are recorded here.
        </p>
      </div>
      {events.length === 0 ? (
        <EmptyState title="No audit events" description="Decisions you record will appear here." />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <AuditEventList events={events} />
        </div>
      )}
    </div>
  );
}
