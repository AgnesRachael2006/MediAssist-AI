import { cn } from "@/lib/cn";
import type { DoctorReviewStatus, EvidenceStrength, ProcessingStatus } from "@/lib/types";

const processingLabels: Record<ProcessingStatus, string> = {
  processing: "Processing",
  analysis_ready: "Analysis Ready",
  reviewed: "Reviewed",
  needs_review: "Needs Review",
  failed: "Analysis failed",
};

const reviewLabels: Record<DoctorReviewStatus, string> = {
  pending: "Pending Doctor Review",
  accepted: "Doctor Approved",
  modified: "Doctor Modified",
  rejected: "Doctor Rejected",
};

const strengthLabels: Record<EvidenceStrength, string> = {
  limited: "Limited",
  moderate: "Moderate",
  strong: "Strong",
};

type BadgeKind =
  | { kind: "processing"; value: ProcessingStatus }
  | { kind: "review"; value: DoctorReviewStatus }
  | { kind: "strength"; value: EvidenceStrength };

export function StatusBadge(props: BadgeKind) {
  let label = "";
  let className = "bg-slate-100 text-slate-700 ring-slate-200";

  if (props.kind === "processing") {
    label = processingLabels[props.value];
    className = {
      processing: "bg-indigo-50 text-indigo-700 ring-indigo-100",
      analysis_ready: "bg-sky-50 text-sky-800 ring-sky-100",
      reviewed: "bg-emerald-50 text-emerald-800 ring-emerald-100",
      needs_review: "bg-amber-50 text-amber-800 ring-amber-100",
      failed: "bg-red-50 text-red-800 ring-red-100",
    }[props.value];
  } else if (props.kind === "review") {
    label = reviewLabels[props.value];
    className = {
      pending: "bg-amber-50 text-amber-800 ring-amber-100",
      accepted: "bg-emerald-50 text-emerald-800 ring-emerald-100",
      modified: "bg-indigo-50 text-indigo-800 ring-indigo-100",
      rejected: "bg-red-50 text-red-800 ring-red-100",
    }[props.value];
  } else {
    label = strengthLabels[props.value];
    className = {
      limited: "bg-slate-100 text-slate-700 ring-slate-200",
      moderate: "bg-amber-50 text-amber-800 ring-amber-100",
      strong: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    }[props.value];
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        className,
      )}
    >
      {label}
    </span>
  );
}
