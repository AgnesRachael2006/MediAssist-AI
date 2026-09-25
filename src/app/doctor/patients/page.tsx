"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { getPatientDirectory } from "@/lib/api";

type Row = Awaited<ReturnType<typeof getPatientDirectory>>[number];

export default function PatientsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getPatientDirectory()
      .then(setRows)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load patients."));
  }, []);

  if (error) return <ErrorState title="Unable to load patients." description={error} />;
  if (!rows) return <LoadingState label="Loading patients..." />;

  const visible = rows.filter((row) => {
    const matches = row.name.toLowerCase().includes(query.toLowerCase()) || row.mrn.toLowerCase().includes(query.toLowerCase());
    if (!matches) return false;
    if (filter === "needs") return row.pending_review > 0;
    if (filter === "shared") return row.access === "shared";
    if (filter === "recent") return Boolean(row.last_visit);
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Patients</h2>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search patients..."
          className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"
          aria-label="Search patients"
        />
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          ["all", "All"],
          ["recent", "Recent"],
          ["needs", "Needs Review"],
          ["shared", "Shared With Me"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1.5 ${filter === id ? "bg-indigo-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Last visit</th>
              <th className="px-4 py-3">Reports</th>
              <th className="px-4 py-3">Pending</th>
              <th className="px-4 py-3">Access</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">
                  {row.access === "none" ? (
                    row.name
                  ) : (
                    <Link className="text-indigo-700" href={`/doctor/patients/${row.id}`}>
                      {row.name}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3">{row.mrn}</td>
                <td className="px-4 py-3">{row.last_visit ?? "—"}</td>
                <td className="px-4 py-3">{row.reports}</td>
                <td className="px-4 py-3">{row.pending_review}</td>
                <td className="px-4 py-3">{row.access === "none" ? "No access" : row.access}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
