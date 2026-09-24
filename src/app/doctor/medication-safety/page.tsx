"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { reviewMedicationSafety } from "@/lib/api";
import { useDemoStore } from "@/lib/useDemoStore";
import { useToast } from "@/components/ui/Toast";

export default function MedicationSafetyPage() {
  const { safetyChecks } = useDemoStore();
  const { notify } = useToast();
  const [openId, setOpenId] = useState<string | null>(safetyChecks[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const selected = safetyChecks.find((item) => item.id === openId) ?? null;

  async function decide(decision: "reviewed" | "approved" | "rejected") {
    if (!selected) return;
    setBusy(true);
    try {
      await reviewMedicationSafety(selected.id, decision);
      notify("Doctor decision recorded. This is not a prescribing order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Medication Safety</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
          Prototype curated rules only. This does not decide that a medicine is safe or unsafe to prescribe. The doctor reviews every warning.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Medication</th>
              <th className="px-4 py-3">Patient allergy</th>
              <th className="px-4 py-3">Known interaction</th>
              <th className="px-4 py-3">Evidence</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Doctor decision</th>
            </tr>
          </thead>
          <tbody>
            {safetyChecks.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{row.medication}</td>
                <td className="px-4 py-3">{row.allergy}</td>
                <td className="px-4 py-3">{row.interaction}</td>
                <td className="px-4 py-3">{row.evidence}</td>
                <td className="px-4 py-3">
                  <span className={row.status === "clear" ? "text-emerald-700" : "text-amber-800"}>
                    {row.status === "clear" ? "CLEAR" : row.status === "warning" ? "WARNING" : "REQUIRES REVIEW"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button type="button" className="font-medium text-indigo-700" onClick={() => setOpenId(row.id)}>
                    {row.doctor_decision}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            {selected.status === "clear" ? "Clear" : "Requires doctor review"}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{selected.medication}</h3>
          <p className="mt-2 text-sm text-slate-600">{selected.interaction}</p>
          <p className="mt-1 text-sm text-slate-500">Source: {selected.evidence}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {selected.why.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => decide("reviewed")}>
              Doctor decision
            </Button>
            <Button variant="success" disabled={busy} onClick={() => decide("approved")}>
              Record review
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => decide("rejected")}>
              Do not publish
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Medication notes stay with the doctor. Nothing here is sent to the patient automatically.
          </p>
        </section>
      ) : null}
    </div>
  );
}
