"use client";

import { useState } from "react";
import Link from "next/link";
import { compareSeries } from "@/lib/clinicalContext";
import { formatDate } from "@/lib/format";
import type { ClinicalObservation, ClinicalVisit } from "@/lib/types";

export function ClinicalTimeline({
  visits,
  observations,
}: {
  visits: ClinicalVisit[];
  observations: ClinicalObservation[];
}) {
  const [compare, setCompare] = useState<string | null>(null);
  const ordered = [...visits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Patient timeline</h2>
      <ol className="space-y-3">
        {ordered.map((visit) => {
          const rows = observations.filter((item) => item.visit_id === visit.id);
          return (
            <li key={visit.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{formatDate(visit.date)}</p>
              <p className="text-sm text-slate-600">{visit.file_name}</p>
              <p className="text-xs text-slate-500">{visit.summary}</p>
              <ul className="mt-3 space-y-2">
                {rows.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      {row.test_name} {row.value} {row.unit}
                    </span>
                    <span className="text-xs text-slate-500">
                      {row.file_name} · Page {row.source_page} · Line {row.source_line}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Compare with previous</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {["Hemoglobin", "MCV", "Platelets"].map((name) => (
            <button
              key={name}
              type="button"
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm"
              onClick={() => setCompare(name)}
            >
              {name}
            </button>
          ))}
        </div>
        {compare ? <CompareBlock name={compare} observations={observations} /> : null}
      </div>
    </div>
  );
}

function CompareBlock({ name, observations }: { name: string; observations: ClinicalObservation[] }) {
  const points = observations
    .filter((item) => item.test_name === name)
    .map((item) => ({ date: item.date, value: item.value }));
  const comparison = compareSeries(points);
  const sources = observations.filter((item) => item.test_name === name);
  if (!comparison) return <p className="mt-3 text-sm text-slate-500">Not enough stored values to compare.</p>;
  return (
    <div className="mt-3 text-sm leading-6 text-slate-700">
      <p>Current {name}: {comparison.current.value}</p>
      <p>Previous {name}: {comparison.previous.value}</p>
      <p>Change: {comparison.delta}</p>
      <ul className="mt-2 space-y-1">
        {sources.map((source) => (
          <li key={source.id}>
            {source.report_id === "rpt-cbc" ? (
              <Link className="text-indigo-700" href={`/doctor/reports/rpt-cbc?finding=${name === "Hemoglobin" ? "f-hb" : name === "MCV" ? "f-mcv" : "f-plt"}`}>
                {source.file_name} · Page {source.source_page} · Line {source.source_line}
              </Link>
            ) : (
              <span>
                {source.file_name} · Page {source.source_page} · Line {source.source_line} · {source.source_text}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
