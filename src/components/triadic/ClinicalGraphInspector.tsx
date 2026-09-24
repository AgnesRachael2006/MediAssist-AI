"use client";

import Link from "next/link";
import { ArrowUpRight, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { needsDoctorReview } from "@/lib/cbcDemo";
import { formatDate, formatDateTime } from "@/lib/format";
import type { MedicalReport } from "@/lib/types";
import { KIND_META, type GraphEntity, type GraphLink } from "./clinicalGraphModel";
import {
  Chip,
  entityTitle,
  findingDecision,
  issueSummary,
  medicationDecision,
  reviewOutcome,
  safetyStatus,
  Sparkline,
} from "./ClinicalGraphNode";

const REASONS: Record<string, string> = {
  OUTSIDE_REFERENCE_RANGE: "Outside reference range",
  MISSING_SOURCE: "Source line missing",
  MISSING_REFERENCE_RANGE: "Reference range missing",
  MISSING_VALUE: "Value missing",
  POSSIBLE_OVERCLAIM: "AI draft may overstate the evidence",
  INSUFFICIENT_CONTEXT: "Insufficient context",
  TREND_CHANGE: "Changed from previous value",
  ROUTINE_NORMAL: "Routine normal",
};

const REVIEW_STATUS: Record<MedicalReport["doctorReviewStatus"], string> = {
  pending: "Pending doctor review",
  accepted: "Accepted by doctor",
  modified: "Modified by doctor",
  rejected: "Rejected by doctor",
};

function decimals(series: { value: number }[]) {
  return Math.max(...series.map((item) => (String(item.value).split(".")[1] ?? "").length));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm leading-5 text-slate-800">{children}</dd>
    </div>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Values({ rows }: { rows: { id: string; name: string; value: string }[] }) {
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-[13px]">
          <span className="text-slate-600">{row.name}</span>
          <span className="font-medium tabular-nums text-slate-900">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function ActionLink({ href, children, secondary }: { href: string; children: React.ReactNode; secondary?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium",
        secondary
          ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          : "bg-indigo-700 text-white hover:bg-indigo-800",
      )}
    >
      {children}
      <ArrowUpRight size={14} />
    </Link>
  );
}

function Details({ entity, entities }: { entity: GraphEntity; entities: GraphEntity[] }) {
  switch (entity.kind) {
    case "patient": {
      const visits = entities.filter((item) => item.kind === "visit");
      const issues = entities.filter((item) => item.kind === "issue");
      const meds = entities.filter((item) => item.kind === "medication");
      const allergies = entities.filter((item) => item.kind === "allergy");
      return (
        <>
          {entity.patient ? (
            <Field label="Patient ID">
              {entity.patient.mrn} · {entity.patient.age} y · {entity.patient.sex}
            </Field>
          ) : null}
          <Field label="Visits">
            {visits.length
              ? `${visits.length} stored · ${formatDate(visits[0].visit.date)} – ${formatDate(visits[visits.length - 1].visit.date)}`
              : "None stored"}
          </Field>
          <Field label="Findings flagged for review">
            {issues.length ? <Bullets items={issues.map((item) => `${item.finding.test_name} — ${issueSummary(item)}`)} /> : "None"}
          </Field>
          <Field label="Allergies">{allergies.map((item) => item.allergy.substance).join(", ") || "None recorded"}</Field>
          <Field label="Medications">
            {meds.length ? (
              <Bullets
                items={meds.map((item) => (
                  <span key={item.id} className="flex items-center justify-between gap-2">
                    {item.safety.medication}
                    <Chip tone={safetyStatus(item.safety).tone}>{safetyStatus(item.safety).label}</Chip>
                  </span>
                ))}
              />
            ) : (
              "None recorded"
            )}
          </Field>
        </>
      );
    }
    case "visit": {
      const flagged = entity.findings.filter(needsDoctorReview);
      return (
        <>
          <Field label="Date">{formatDate(entity.visit.date)}</Field>
          <Field label="Report">{entity.visit.file_name}</Field>
          <Field label="Outcome">{reviewOutcome(entity.findings, entity.visit.summary)}</Field>
          {entity.observations.length ? (
            <Field label="Values recorded">
              <Values
                rows={entity.observations.map((item) => ({ id: item.id, name: item.test_name, value: `${item.value} ${item.unit}` }))}
              />
            </Field>
          ) : null}
          {flagged.length ? (
            <Field label="Clinical issues flagged">
              <Bullets items={flagged.map((finding) => finding.test_name)} />
            </Field>
          ) : null}
        </>
      );
    }
    case "report": {
      const flagged = entity.findings.filter(needsDoctorReview);
      return (
        <>
          <Field label="Date">{formatDate(entity.visit.date)}</Field>
          {entity.report ? <Field label="Type">{entity.report.title}</Field> : null}
          <Field label="Status">
            {entity.findings.length
              ? `${entity.findings.length} rows extracted · ${flagged.length} flagged for review`
              : entity.visit.summary}
          </Field>
          {entity.report ? <Field label="Review">{REVIEW_STATUS[entity.report.doctorReviewStatus]}</Field> : null}
          <Field label="Linked visit">
            {formatDate(entity.visit.date)} · {entity.visit.label}
          </Field>
          {flagged.length ? (
            <Field label="Clinical issues">
              <Bullets items={flagged.map((finding) => finding.test_name)} />
            </Field>
          ) : entity.observations.length ? (
            <Field label="Values on file">
              <Values
                rows={entity.observations.map((item) => ({ id: item.id, name: item.test_name, value: `${item.value} ${item.unit}` }))}
              />
            </Field>
          ) : null}
          <Field label="Outcome">{reviewOutcome(entity.findings, entity.visit.summary)}</Field>
        </>
      );
    }
    case "issue": {
      const { finding, series } = entity;
      const decision = findingDecision(finding);
      return (
        <>
          <div className="py-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums text-slate-900">{finding.value}</span>
              <span className="text-sm text-slate-500">{finding.unit}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Reference {finding.reference_range}</p>
          </div>
          {series.length > 1 ? (
            <Field label={`Trend across ${series.length} visits`}>
              <Sparkline values={series.map((item) => item.value)} width={296} height={44} className="text-amber-500" />
              <div className="mt-2">
                <Values
                  rows={series.map((item) => ({ id: item.id, name: formatDate(item.date), value: `${item.value.toFixed(decimals(series))} ${item.unit}` }))}
                />
              </div>
            </Field>
          ) : null}
          <Field label="Why it was flagged">
            <Bullets items={finding.jev.reason_codes.map((code) => REASONS[code] ?? code)} />
          </Field>
          <Field label="Evidence">
            <span className="capitalize">{finding.jev.evidence}</span>
            {finding.overclaim_detail?.missing.length ? (
              <span className="text-slate-500"> · not in record: {finding.overclaim_detail.missing.join(", ")}</span>
            ) : null}
          </Field>
          <Field label="Source">
            {entity.visit?.file_name ?? finding.report_id} · page {finding.source.page}, line {finding.source.line_start}
            <code className="mt-1.5 block rounded-lg bg-slate-50 px-2.5 py-2 font-mono text-[11px] leading-4 text-slate-600">
              {finding.source.excerpt}
            </code>
          </Field>
          {entity.visit ? <Field label="Linked visit">{formatDate(entity.visit.date)}</Field> : null}
          <Field label="Outcome">
            <Chip tone={decision.tone}>{decision.label}</Chip>
            {finding.final_text ? <p className="mt-1.5 text-slate-600">{finding.final_text}</p> : null}
            {finding.decided_at ? (
              <p className="mt-1 text-xs text-slate-400">
                {finding.doctor_name ?? "Doctor"} · {formatDateTime(finding.decided_at)}
              </p>
            ) : null}
          </Field>
        </>
      );
    }
    case "medication": {
      const status = safetyStatus(entity.safety);
      return (
        <>
          {entity.regimen ? (
            <Field label="Regimen">
              {entity.regimen.dosage} · {entity.regimen.frequency}
            </Field>
          ) : null}
          <Field label="Safety status">
            <Chip tone={status.tone}>{status.label}</Chip>
            <p className="mt-1.5">{entity.safety.interaction}</p>
          </Field>
          <Field label="Allergy check">{entity.safety.allergy}</Field>
          <Field label="Evidence">{entity.safety.evidence}</Field>
          <Field label="Why">
            <Bullets items={entity.safety.why} />
          </Field>
          <Field label="Doctor decision">
            {medicationDecision(entity.safety)}
            {entity.safety.decided_at ? (
              <span className="text-slate-400"> · {formatDateTime(entity.safety.decided_at)}</span>
            ) : null}
          </Field>
        </>
      );
    }
    case "allergy":
      return (
        <>
          <Field label="Recorded in">{entity.allergy.source}</Field>
          <Field label="Medication safety">
            {entity.concerns.length ? (
              <div className="space-y-2">
                {entity.concerns.map((row) => (
                  <div key={row.id} className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-rose-800">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="font-medium">{row.medication}</span> — {row.interaction.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              "No stored medication concern"
            )}
          </Field>
        </>
      );
  }
}

function Actions({ entity, reportIds }: { entity: GraphEntity; reportIds: Set<string> }) {
  switch (entity.kind) {
    case "patient":
      return <ActionLink href="/doctor/history">Open patient history</ActionLink>;
    case "visit":
      return (
        <>
          <ActionLink href="/doctor/history" secondary={reportIds.has(entity.visit.report_id)}>
            Patient history
          </ActionLink>
          {reportIds.has(entity.visit.report_id) ? (
            <ActionLink href={`/doctor/reports/${entity.visit.report_id}`}>View report</ActionLink>
          ) : null}
        </>
      );
    case "report":
      return reportIds.has(entity.visit.report_id) ? (
        <ActionLink href={`/doctor/reports/${entity.visit.report_id}`}>View report</ActionLink>
      ) : (
        <ActionLink href="/doctor/history">View in patient history</ActionLink>
      );
    case "issue":
      return reportIds.has(entity.finding.report_id) ? (
        <ActionLink href={`/doctor/reports/${entity.finding.report_id}?finding=${entity.finding.id}`}>Open finding</ActionLink>
      ) : (
        <ActionLink href="/doctor/history">View in patient history</ActionLink>
      );
    case "medication":
    case "allergy":
      return <ActionLink href="/doctor/medication-safety">Open medication safety</ActionLink>;
  }
}

export function ClinicalGraphInspector({
  entity,
  open,
  entities,
  links,
  reportIds,
  onSelect,
  onClose,
}: {
  entity: GraphEntity | undefined;
  open: boolean;
  entities: GraphEntity[];
  links: GraphLink[];
  reportIds: Set<string>;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const byId = new Map(entities.map((item) => [item.id, item]));
  const connections = entity
    ? links
        .filter((link) => link.source === entity.id || link.target === entity.id)
        .map((link) => {
          const otherId = link.source === entity.id ? link.target : link.source;
          return { link, other: byId.get(otherId), outgoing: link.source === entity.id };
        })
        .filter((row): row is typeof row & { other: GraphEntity } => Boolean(row.other))
    : [];

  return (
    <aside
      aria-label="Selected entity"
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "absolute z-20 flex flex-col bg-white transition-transform duration-300 ease-out",
        "inset-x-0 bottom-0 h-[62%] rounded-t-2xl border-t border-slate-200 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)]",
        "sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[360px] sm:rounded-none sm:border-l sm:border-t-0 sm:shadow-[-8px_0_24px_-16px_rgba(15,23,42,0.18)]",
        open ? "translate-x-0 translate-y-0" : "translate-y-full sm:translate-x-full sm:translate-y-0",
      )}
    >
      {entity ? (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Selected entity</p>
              <h3 className="mt-1.5 truncate text-lg font-semibold text-slate-900">{entityTitle(entity)}</h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <span className={cn("h-1.5 w-1.5 rounded-full", KIND_META[entity.kind].dot)} />
                {entity.kind === "report" ? "Clinical report" : KIND_META[entity.kind].label}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5">
            <dl className="divide-y divide-slate-100">
              <Details entity={entity} entities={entities} />
            </dl>
            {connections.length ? (
              <div className="border-t border-slate-100 py-3">
                <p className="text-[11px] font-medium text-slate-400">Relationships</p>
                <ul className="mt-1.5 space-y-0.5">
                  {connections.map(({ link, other, outgoing }) => (
                    <li key={link.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(other.id)}
                        className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
                      >
                        <span className="w-28 shrink-0 truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                          {outgoing ? link.label : `← ${link.label}`}
                        </span>
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", KIND_META[other.kind].dot)} />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700 group-hover:text-slate-900">
                          {entityTitle(other)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
            <Actions entity={entity} reportIds={reportIds} />
          </div>
        </>
      ) : null}
    </aside>
  );
}
