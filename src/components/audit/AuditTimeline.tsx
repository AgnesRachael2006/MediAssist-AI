import { formatDate, formatDateTime } from "@/lib/format";
import type { AuditAction, AuditLog } from "@/lib/types";

const ACTION_COPY: Record<AuditLog["action"], string> = {
  report_uploaded: "Report uploaded",
  ai_analysis_generated: "AI analysis completed",
  ai_finding_created: "AI finding created",
  ai_analysis_failed: "Analysis failed",
  doctor_reviewed: "Doctor reviewed report",
  doctor_accepted: "Doctor accepted",
  doctor_modified: "Doctor edited",
  doctor_rejected: "Doctor rejected",
  patient_explanation_generated: "Patient explanation generated",
  patient_viewed_explanation: "Patient viewed explanation",
  safety_check_run: "Medication safety check run",
  medication_check_performed: "Medication check performed",
  medication_decision_recorded: "Decision recorded",
};

function dotClass(action: AuditAction) {
  if (
    action === "doctor_accepted" ||
    action === "doctor_reviewed" ||
    action === "patient_explanation_generated" ||
    action === "patient_viewed_explanation"
  ) {
    return "bg-emerald-600";
  }
  if (action === "doctor_rejected" || action === "ai_analysis_failed") return "bg-red-600";
  if (action === "doctor_modified" || action === "medication_decision_recorded") return "bg-amber-500";
  return "bg-indigo-700";
}

export function AuditTimeline({
  logs,
  size = "md",
}: {
  logs: AuditLog[];
  size?: "md" | "lg";
}) {
  if (logs.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
        No audit events yet.
      </p>
    );
  }

  const groups: Array<{ day: string; items: AuditLog[] }> = [];
  for (const log of logs) {
    const day = formatDate(log.timestamp);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(log);
    else groups.push({ day, items: [log] });
  }

  const text = size === "lg" ? "text-base" : "text-sm";

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.day}>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{group.day}</h3>
          <ol className="relative space-y-0 border-l border-slate-200 pl-6">
            {group.items.map((log) => (
              <li key={log.id} className="relative pb-6 last:pb-0">
                <span
                  className={`absolute -left-[29px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${dotClass(log.action)}`}
                />
                <p className="text-xs text-slate-500">{formatDateTime(log.timestamp)}</p>
                <p className={`${text} font-medium text-slate-900`}>{ACTION_COPY[log.action]}</p>
                <p className={`${text} text-slate-600`}>
                  {log.actor} · {log.detail}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
