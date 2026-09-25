"use client";

import { useState } from "react";
import Link from "next/link";
import { compareSeries } from "@/lib/clinicalContext";
import { formatDate } from "@/lib/format";
import type { ClinicalObservation, ClinicalVisit } from "@/lib/types";

const COMPARE = ["Hemoglobin", "MCV", "Platelets"];

export function ClinicalTimeline({
  visits,
  observations,
  showHeading = true,
  patientView = false,
}: {
  visits: ClinicalVisit[];
  observations: ClinicalObservation[];
  showHeading?: boolean;
  patientView?: boolean;
}) {
  const ordered = [...visits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const [openId, setOpenId] = useState<string | null>(ordered[0]?.id ?? null);
  const [compare, setCompare] = useState<string | null>(null);

  if (ordered.length === 0) {
    return <p className="text-sm text-slate-500">No visits have been recorded yet.</p>;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {showHeading ? <h2 className="text-sm font-semibold text-slate-900">Patient timeline</h2> : null}
      <ol className={`${showHeading ? "mt-4" : ""} relative ml-1 border-l border-slate-200 pl-5`}>
        {ordered.map((visit, index) => {
          const rows = observations.filter((item) => item.visit_id === visit.id);
          const preview = rows
            .slice(0, 3)
            .map((row) => `${shortName(row.test_name)} ${row.value}`)
            .join("  ·  ");
          const open = openId === visit.id;
          return (
            <li key={visit.id} className="relative pb-5 last:pb-0">
              <span
                className={`absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                  index === 0 ? "bg-indigo-700" : "bg-slate-300"
                }`}
              />
              <button
                type="button"
                className="w-full text-left"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : visit.id)}
              >
                <p className="text-xs text-slate-500">{formatDate(visit.date)}</p>
                <p className="text-sm font-medium text-slate-900">
                  {patientView ? "Blood count" : visit.file_name.replaceAll("_", " ").replace(".pdf", "")}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">{preview || "No stored values"}</p>
              </button>
              {open ? (
                <div className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
                  <p>{patientView ? (index === 0 ? "Latest report" : "Earlier report kept for comparison.") : visit.summary}</p>
                  {!patientView
                    ? rows.map((row) => (
                        <p key={row.id}>
                          {row.report_id === "rpt-cbc" ? (
                            <Link
                              className="text-indigo-700"
                              href={`/doctor/reports/rpt-cbc?finding=${findingId(row.test_name)}`}
                            >
                              {row.test_name} {row.value} {row.unit} · line {row.source_line}
                            </Link>
                          ) : (
                            <span>
                              {row.test_name} {row.value} {row.unit} · {row.source_text}
                            </span>
                          )}
                        </p>
                      ))
                    : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {patientView ? null : (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Compare</span>
            {COMPARE.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCompare((current) => (current === name ? null : name))}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  compare === name ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          {compare ? <CompareLine name={compare} observations={observations} /> : null}
        </div>
      )}
    </section>
  );
}

function shortName(name: string) {
  if (name === "Hemoglobin") return "Hb";
  if (name === "Platelets") return "Plt";
  return name;
}

function findingId(name: string) {
  if (name === "Hemoglobin") return "f-hb";
  if (name === "MCV") return "f-mcv";
  if (name === "Platelets") return "f-plt";
  return "f-hb";
}

function CompareLine({ name, observations }: { name: string; observations: ClinicalObservation[] }) {
  const comparison = compareSeries(
    observations.filter((item) => item.test_name === name).map((item) => ({ date: item.date, value: item.value })),
  );
  if (!comparison) {
    return <p className="mt-2 text-xs text-slate-500">Not enough stored values to compare.</p>;
  }
  const direction = comparison.delta < 0 ? "decreased" : comparison.delta > 0 ? "increased" : "unchanged";
  const amount = comparison.delta === 0 ? "" : ` by ${Math.abs(comparison.delta)}`;
  return (
    <p className="mt-2 text-sm text-slate-700">
      {name} {direction}
      {amount} from the previous recorded value ({comparison.previous.value} → {comparison.current.value}).
    </p>
  );
}
