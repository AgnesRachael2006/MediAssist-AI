import { Badge } from "@/components/ui/Badge";
import { needsDoctorReview } from "@/lib/cbcDemo";
import type { FindingCard } from "@/lib/types";
import { cn } from "@/lib/cn";

function triageLabel(finding: FindingCard) {
  if (finding.jev.triage === "review_needed") return "Review needed";
  if (finding.jev.triage === "insufficient") return "Insufficient";
  return "Routine normal";
}

export function FindingCardView({
  finding,
  selected,
  onSelect,
}: {
  finding: FindingCard;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = needsDoctorReview(finding) ? "amber" : "green";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-2xl border p-4 text-left shadow-sm",
        selected ? "border-indigo-300 bg-indigo-50/50 ring-2 ring-indigo-100" : "border-slate-200 bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">{finding.test_name}</p>
          <p className="mt-1 text-sm text-slate-800">
            {finding.value} {finding.unit}
          </p>
        </div>
        <Badge tone={tone}>{triageLabel(finding)}</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-500">Reference: {finding.reference_range}</p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        Evidence: {finding.jev.evidence}
        {finding.jev.overclaim ? " · Possible overclaim" : ""}
      </p>
      <p className="mt-2 text-sm text-slate-700">
        Source: Page {finding.source.page} · Line {finding.source.line_start}
      </p>
    </button>
  );
}
