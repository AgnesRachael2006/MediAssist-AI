"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { accessSharedRecord } from "@/lib/api";

export default function SharedAccessPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [record, setRecord] = useState<Awaited<ReturnType<typeof accessSharedRecord>> | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      setRecord(await accessSharedRecord(code));
    } catch (caught) {
      setRecord(null);
      setError(caught instanceof Error ? caught.message : "Forbidden");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Shared access</h2>
      <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          Access code
          <input
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setRecord(null);
            }}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <Button className="mt-3" type="submit">Access record</Button>
      </form>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {record ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <p className="font-semibold text-slate-900">Shared record</p>
          <div className="mt-3 space-y-3">
            {record.reports.map((item) => (
              <div key={item.id}>
                <p className="font-medium text-slate-900">{item.title}</p>
                {item.summary ? (
                  <p className="mt-1 leading-6 text-slate-700">
                    <span className="font-medium text-indigo-800">AI-assisted summary shared by the patient. </span>
                    {item.summary}
                  </p>
                ) : (
                  <p className="mt-1 text-slate-500">No AI summary was included in this share.</p>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3">Approved notes: {record.findings.length}</p>
          <p>Allergies: {record.allergies.map((item) => item.substance).join(", ") || "Not shared"}</p>
          <p>Medications: {record.medications.map((item) => item.medication).join(", ") || "Not shared"}</p>
        </article>
      ) : null}
    </div>
  );
}
