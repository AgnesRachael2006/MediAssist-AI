import type { SystemHealth } from "@/lib/types";

const ITEMS = [
  ["pdf", "PDF extraction"],
  ["gemini", "Gemini"],
  ["jev", "Jev"],
  ["database", "Database"],
] as const;

export function SystemStatus({ status }: { status: SystemHealth }) {
  const aiDown = !status.gemini || !status.jev;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">System status</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {ITEMS.map(([key, label]) => (
          <li key={key} className={status[key] ? "text-emerald-800" : "text-amber-800"}>
            {label} {status[key] ? "✓" : "–"}
          </li>
        ))}
      </ul>
      {aiDown ? (
        <p className="mt-2 text-sm text-slate-700">
          AI assistance unavailable. Structured report data remains available.
        </p>
      ) : null}
    </div>
  );
}
