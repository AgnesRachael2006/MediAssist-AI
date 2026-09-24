"use client";

import Link from "next/link";
import { listPatients } from "@/lib/api";
import { useDemoStore } from "@/lib/useDemoStore";
import { loadDemoPatient } from "@/lib/api";
import { useState } from "react";

export default function PatientsPage() {
  const patients = listPatients();
  const { reports } = useDemoStore();
  const [highlight, setHighlight] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={async () => {
          const patient = await loadDemoPatient();
          setHighlight(patient.id);
        }}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
      >
        Load Demo Patient
      </button>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {patients.map((patient) => {
          const count = reports.filter((report) => report.patientId === patient.id).length;
          return (
            <article
              key={patient.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${
                highlight === patient.id ? "border-indigo-300 ring-2 ring-indigo-50" : "border-slate-200"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{patient.name}</p>
              <p className="text-xs text-slate-500">
                {patient.age} · {patient.sex} · {patient.mrn}
              </p>
              <p className="mt-2 text-xs text-slate-500">Allergies: {patient.allergies.join(", ")}</p>
              <p className="mt-3 text-sm text-slate-600">
                {count} report{count === 1 ? "" : "s"}
              </p>
              <Link
                href="/doctor/reports"
                className="mt-3 inline-block text-sm font-medium text-indigo-700 hover:underline"
              >
                View reports
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
