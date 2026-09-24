import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AIInsight } from "@/lib/types";

export function AIInsightCard({
  insight,
  compact = false,
}: {
  insight: AIInsight;
  compact?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">
            AI Generated · AI Clinical Insight
          </p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{insight.title}</h3>
        </div>
        {insight.reviewRecommended ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            Review Recommended
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-slate-600">{insight.finding}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>Evidence Strength:</span>
        <StatusBadge kind="strength" value={insight.evidenceStrength} />
      </div>
      {!compact ? (
        <p className="mt-3 text-xs text-slate-500">{insight.consideration}</p>
      ) : null}
    </article>
  );
}

export function EvidenceCard({ insight }: { insight: AIInsight }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Finding</p>
        <p className="mt-1 text-sm text-slate-800">{insight.finding}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence</p>
        <p className="mt-1 text-sm text-slate-800">{insight.evidence}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Evidence Strength
        </p>
        <div className="mt-1">
          <StatusBadge kind="strength" value={insight.evidenceStrength} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Supporting Information
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700">
          {insight.supportingInformation.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Missing Information
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700">
          {insight.missingInformation.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <p className="text-xs font-semibold uppercase tracking-wide">Recommended Review</p>
        <p className="mt-1">{insight.recommendedReview}</p>
      </div>
      <p className="text-xs italic text-slate-500">{insight.consideration}</p>
    </div>
  );
}
