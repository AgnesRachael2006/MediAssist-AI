"use client";

import { AuditEventList } from "@/components/triadic/AuditEvent";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDemoStore } from "@/lib/useDemoStore";

export default function PatientAuditPage() {
  const { triadicEvents } = useDemoStore();
  const events = triadicEvents
    .filter(
      (event) =>
        event.action === "Report uploaded" ||
        event.action === "Patient explanation published" ||
        /accepted by|edited by/i.test(event.action),
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (events.length === 0) {
    return <EmptyState title="No published record yet." description="Approved steps will appear here." />;
  }

  return (
    <div className="space-y-4">
      <p className="text-base leading-7 text-slate-600">
        This record shows uploaded reports and wording your doctor published. Drafts and rejected cards are not listed.
      </p>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <AuditEventList events={events} />
      </div>
    </div>
  );
}
