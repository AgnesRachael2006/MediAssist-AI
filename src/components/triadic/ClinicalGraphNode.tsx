"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { needsDoctorReview } from "@/lib/cbcDemo";
import { formatDate } from "@/lib/format";
import type { FindingCard, MedicationSafetyRow } from "@/lib/types";
import { KIND_META, type GraphEntity } from "./clinicalGraphModel";

export type Tone = "slate" | "indigo" | "amber" | "green" | "rose";

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-600",
  indigo: "bg-indigo-50 text-indigo-700",
  amber: "bg-amber-50 text-amber-800",
  green: "bg-emerald-50 text-emerald-700",
  rose: "bg-rose-50 text-rose-700",
};

export function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium", TONES[tone])}>
      {children}
    </span>
  );
}

export function findingDecision(finding: FindingCard): { label: string; tone: Tone } {
  switch (finding.doctor_decision) {
    case "accepted":
      return { label: "Accepted", tone: "green" };
    case "edited":
      return { label: "Edited · approved", tone: "green" };
    case "rejected":
      return { label: "Rejected", tone: "slate" };
    default:
      return { label: "To review", tone: "amber" };
  }
}

export function safetyStatus(row: MedicationSafetyRow): { label: string; tone: Tone } {
  if (row.status === "warning") return { label: "Warning", tone: "rose" };
  if (row.status === "requires_review") return { label: "Needs review", tone: "amber" };
  return { label: "No concern", tone: "green" };
}

export function medicationDecision(row: MedicationSafetyRow) {
  return {
    pending: "Decision pending",
    reviewed: "Reviewed",
    approved: "Approved",
    rejected: "Rejected",
  }[row.doctor_decision];
}

/* Doctor-decision outcome for the findings a report sent to review. */
export function reviewOutcome(findings: FindingCard[], fallback: string) {
  const flagged = findings.filter(needsDoctorReview);
  if (!flagged.length) return fallback;
  const pending = flagged.filter((finding) => finding.doctor_decision === "pending").length;
  if (pending) return `${pending} awaiting review`;
  return `${flagged.length} reviewed`;
}

export function entityTitle(entity: GraphEntity) {
  switch (entity.kind) {
    case "patient":
      return entity.name;
    case "visit":
      return formatDate(entity.visit.date);
    case "report":
      return entity.visit.file_name;
    case "issue":
      return entity.finding.test_name;
    case "medication":
      return entity.safety.medication;
    case "allergy":
      return entity.allergy.substance;
  }
}

export function issueSummary(entity: Extract<GraphEntity, { kind: "issue" }>) {
  const { finding, direction } = entity;
  const value = `${finding.value} ${finding.unit}`;
  if (direction === "below") return `Below reference · ${value}`;
  if (direction === "above") return `Above reference · ${value}`;
  if (finding.jev.triage === "insufficient") return `Insufficient information · ${value}`;
  return `Needs review · ${value}`;
}

export function Sparkline({
  values,
  width,
  height,
  className,
}: {
  values: number[];
  width: number;
  height: number;
  className?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 3;
  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (width - pad * 2);
    const y = max === min ? height / 2 : pad + ((max - value) / (max - min)) * (height - pad * 2);
    return [x, y] as const;
  });
  const last = points[points.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.slice(0, -1).map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r={1.75} fill="white" stroke="currentColor" strokeWidth={1.25} />
      ))}
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="currentColor" />
    </svg>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] leading-4 text-slate-400">{label}</p>
      <div className="truncate text-xs font-medium leading-4 text-slate-700">{children}</div>
    </div>
  );
}

function Header({ entity, chip }: { entity: GraphEntity; chip?: React.ReactNode }) {
  const meta = KIND_META[entity.kind];
  return (
    <div className="flex h-4 shrink-0 items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
        <span className="truncate whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{meta.label}</span>
      </span>
      {chip}
    </div>
  );
}

function Footer({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 flex shrink-0 items-center gap-1 text-[11px] leading-4 font-medium text-slate-400 transition-colors group-hover:text-indigo-600 group-aria-pressed:text-indigo-600">
      {children}
      <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
    </p>
  );
}

function Body({ entity }: { entity: GraphEntity }) {
  switch (entity.kind) {
    case "patient": {
      const initials = entity.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2);
      const patient = entity.patient;
      return (
        <>
          <Header entity={entity} chip={patient ? <span className="text-[10px] text-slate-400">{patient.mrn}</span> : null} />
          <div className="mt-2.5 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold text-indigo-700">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold leading-6 text-slate-900">{entity.name}</p>
              <p className="shrink-0 truncate text-xs leading-4 text-slate-500">
                {patient ? `${patient.age} y · ${patient.sex} · Synthetic record` : "Synthetic record"}
              </p>
            </div>
          </div>
        </>
      );
    }
    case "visit": {
      const outcome = reviewOutcome(entity.findings, entity.visit.summary);
      return (
        <>
          <Header entity={entity} chip={entity.latest ? <Chip tone="indigo">Latest</Chip> : null} />
          <p className="mt-1.5 shrink-0 truncate text-[15px] font-semibold leading-5 text-slate-900">{formatDate(entity.visit.date)}</p>
          <p className="shrink-0 truncate text-xs leading-4 text-slate-500">{entity.visit.label}</p>
          <div className="mt-auto grid shrink-0 grid-cols-[1.35fr_1fr] gap-2 border-t border-slate-100 pt-1.5">
            <Meta label="Outcome">{outcome}</Meta>
            <Meta label="Values">{entity.observations.length} recorded</Meta>
          </div>
          <Footer>View visit</Footer>
        </>
      );
    }
    case "report": {
      const flagged = entity.findings.filter(needsDoctorReview);
      const pending = flagged.some((finding) => finding.doctor_decision === "pending");
      const chip = flagged.length ? (
        <Chip tone={pending ? "amber" : "green"}>{pending ? "Review needed" : "Reviewed"}</Chip>
      ) : null;
      const result = entity.findings.length
        ? `${flagged.length} of ${entity.findings.length} flagged`
        : `${entity.observations.length} values on file`;
      return (
        <>
          <Header entity={entity} chip={chip} />
          <p className="mt-1.5 shrink-0 truncate text-[15px] font-semibold leading-5 text-slate-900">{entity.visit.file_name}</p>
          <p className="shrink-0 truncate text-xs leading-4 text-slate-500">{entity.report?.title ?? "Stored report file"}</p>
          <div className="mt-auto grid shrink-0 grid-cols-[1.35fr_1fr] gap-2 border-t border-slate-100 pt-1.5">
            <Meta label="Result">{result}</Meta>
            <Meta label="Date">{formatDate(entity.visit.date)}</Meta>
          </div>
          <Footer>View report</Footer>
        </>
      );
    }
    case "issue": {
      const decision = findingDecision(entity.finding);
      return (
        <>
          <Header entity={entity} chip={<Chip tone={decision.tone}>{decision.label}</Chip>} />
          <p className="mt-1.5 shrink-0 truncate text-[15px] font-semibold leading-5 text-slate-900">{entity.finding.test_name}</p>
          <p className="shrink-0 truncate text-xs leading-4 text-slate-500">{issueSummary(entity)}</p>
          <div className="mt-auto grid shrink-0 grid-cols-[1.35fr_1fr] gap-2 border-t border-slate-100 pt-1.5">
            <Meta label="Trend">
              {entity.series.length > 1 ? (
                <Sparkline
                  values={entity.series.map((item) => item.value)}
                  width={72}
                  height={16}
                  className="block text-amber-500"
                />
              ) : (
                "Single value"
              )}
            </Meta>
            <Meta label="Linked visits">{new Set(entity.series.map((item) => item.visit_id)).size || 1}</Meta>
          </div>
          <Footer>View finding</Footer>
        </>
      );
    }
    case "medication": {
      const status = safetyStatus(entity.safety);
      return (
        <>
          <Header entity={entity} chip={<Chip tone={status.tone}>{status.label}</Chip>} />
          <p className="mt-1.5 shrink-0 truncate text-[15px] font-semibold leading-5 text-slate-900">{entity.safety.medication}</p>
          <p className="shrink-0 truncate text-xs leading-4 text-slate-500">
            {entity.regimen ? `${entity.regimen.dosage} · ${entity.regimen.frequency}` : "Medication safety record"}
          </p>
          <div className="mt-auto grid shrink-0 grid-cols-[1.35fr_1fr] gap-2 border-t border-slate-100 pt-1.5">
            <Meta label="Safety check">{entity.safety.interaction}</Meta>
            <Meta label="Decision">{medicationDecision(entity.safety)}</Meta>
          </div>
          <Footer>View details</Footer>
        </>
      );
    }
    case "allergy":
      return (
        <>
          <Header entity={entity} />
          <p className="mt-1.5 shrink-0 truncate text-[15px] font-semibold leading-5 text-slate-900">{entity.allergy.substance}</p>
          <p className="shrink-0 truncate text-xs leading-4 text-slate-500">Recorded in {entity.allergy.source.toLowerCase()}</p>
          <div className="mt-auto shrink-0">
            {entity.concerns.length ? (
              <p className="flex items-center gap-1.5 truncate rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] font-medium text-rose-700">
                <TriangleAlert size={12} className="shrink-0" />
                Relevant to {entity.concerns.map((row) => row.medication).join(", ")}
              </p>
            ) : (
              <p className="rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500">No linked medication concern</p>
            )}
          </div>
          <Footer>View details</Footer>
        </>
      );
  }
}

export function ClinicalGraphNode({
  entity,
  selected,
  dimmed,
  onSelect,
  onHover,
}: {
  entity: GraphEntity;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const isPatient = entity.kind === "patient";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${KIND_META[entity.kind].label}: ${entityTitle(entity)}`}
      data-graph-node
      onClick={() => onSelect(entity.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(entity.id);
        }
      }}
      onPointerEnter={() => onHover(entity.id)}
      onPointerLeave={() => onHover(null)}
      style={{ left: entity.x - entity.w / 2, top: entity.y - entity.h / 2, width: entity.w, height: entity.h }}
      className={cn(
        "group absolute flex cursor-pointer select-none flex-col overflow-hidden rounded-2xl border bg-white px-3.5 py-3 text-left outline-none",
        "transition-[transform,opacity,box-shadow,border-color,filter] duration-200 ease-out",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_-10px_rgba(15,23,42,0.12)]",
        "hover:scale-[1.015] hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_24px_-12px_rgba(15,23,42,0.2)]",
        "focus-visible:ring-4 focus-visible:ring-indigo-500/20",
        isPatient ? "border-indigo-200 px-4 py-3.5" : "border-slate-200 hover:border-slate-300",
        selected && "border-indigo-400 ring-4 ring-indigo-500/10 hover:border-indigo-400",
        dimmed && "opacity-35 saturate-50 hover:opacity-80",
      )}
    >
      <Body entity={entity} />
    </div>
  );
}
