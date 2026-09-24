import { formatDateTime } from "@/lib/format";
import type { TriadicAuditEvent } from "@/lib/types";

export function AuditEvent({ event }: { event: TriadicAuditEvent }) {
  return (
    <li className="relative pb-6 last:pb-0">
      <span className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-700" />
      <p className="text-xs text-slate-500">{formatDateTime(event.timestamp)}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{event.actor_kind}</p>
      <p className="text-sm font-medium text-slate-900">{event.action}</p>
      <p className="text-sm text-slate-600">
        {event.actor} · {event.detail}
      </p>
    </li>
  );
}

export function AuditEventList({ events }: { events: TriadicAuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No audit events yet.</p>;
  }
  return (
    <ol className="relative border-l border-slate-200 pl-6">
      {events.map((event) => (
        <AuditEvent key={event.id} event={event} />
      ))}
    </ol>
  );
}
