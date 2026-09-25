"use client";

import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { addHandoffAiSummary, createHandoff, listHandoffs } from "@/lib/api";
import { useDemoStore } from "@/lib/useDemoStore";
import type { ClinicalHandoff } from "@/lib/types";

export default function HandoffPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const state = useDemoStore();
  const [reason, setReason] = useState("Persistent low hemoglobin");
  const [error, setError] = useState("");
  const [packs, setPacks] = useState<ClinicalHandoff[]>([]);

  useEffect(() => {
    listHandoffs()
      .then((items) => setPacks(items.filter((item) => item.patient_id === patientId)))
      .catch(() => setPacks([]));
  }, [patientId, state.handoffs]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await createHandoff(patientId, "doctor-3", reason);
      const items = await listHandoffs();
      setPacks(items.filter((item) => item.patient_id === patientId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the handoff.");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Clinical handoff</h2>
        <p className="mt-1 text-sm text-slate-500">Built from stored results and approved notes. It does not add a diagnosis.</p>
      </div>
      <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          Reason for referral
          <input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <p className="mt-3 text-sm text-slate-600">Receiving doctor: Dr. Shwetha</p>
        <Button className="mt-3" type="submit">Create handoff pack</Button>
      </form>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {packs.map((item) => (
        <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <p className="font-semibold text-slate-900">{item.reason}</p>
          <p className="mt-2 leading-6 text-slate-700">{item.summary}</p>
          {item.ai_summary ? (
            <p className="mt-3 rounded-xl bg-indigo-50 p-3 text-indigo-950">AI-assisted summary: {item.ai_summary}</p>
          ) : (
            <button
              type="button"
              className="mt-3 text-sm font-medium text-indigo-700"
              onClick={() =>
                void addHandoffAiSummary(item.id).then(() =>
                  listHandoffs().then((items) => setPacks(items.filter((row) => row.patient_id === patientId))),
                )
              }
            >
              AI-assisted summary
            </button>
          )}
          <Link className="mt-3 inline-flex text-indigo-700" href="/doctor/reports/rpt-cbc?finding=f-hb">View evidence</Link>
        </article>
      ))}
    </div>
  );
}
