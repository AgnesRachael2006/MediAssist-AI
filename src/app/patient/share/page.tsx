"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { createShare, listDoctors, listShares } from "@/lib/api";
import type { RecordShare, SharePermission } from "@/lib/types";

const OPTIONS: { id: SharePermission; label: string }[] = [
  { id: "lab_reports", label: "Lab reports" },
  { id: "approved_findings", label: "Approved findings" },
  { id: "allergies", label: "Allergies" },
  { id: "medications", label: "Medications" },
  { id: "consultations", label: "Previous consultations" },
  { id: "ai_summaries", label: "AI report summaries" },
];

export default function SharePage() {
  const doctors = listDoctors().filter((doctor) => doctor.id !== "doctor-2");
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "doctor-3");
  const [hours, setHours] = useState(24);
  const [purpose, setPurpose] = useState("Consultation");
  const [permissions, setPermissions] = useState<SharePermission[]>(["lab_reports", "approved_findings", "allergies"]);
  const [shares, setShares] = useState<RecordShare[]>([]);
  const [created, setCreated] = useState<RecordShare | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listShares().then(setShares).catch(() => setShares([]));
  }, [created]);

  function toggle(id: SharePermission) {
    setPermissions((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const share = await createShare({ doctorId, permissions, hours, purpose });
      setCreated(share);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create access.");
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Share my health record</h2>
        <p className="mt-1 text-sm text-slate-500">Choose what the doctor can open. AI summaries stay private until you tick that option. You can revoke access at any time.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          Doctor
          <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Information to share</legend>
          <div className="mt-2 space-y-1">
            {OPTIONS.map((option) => (
              <label key={option.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={permissions.includes(option.id)} onChange={() => toggle(option.id)} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-medium text-slate-700">
          Access duration
          <select value={hours} onChange={(event) => setHours(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
            <option value={24}>24 hours</option>
            <option value={72}>72 hours</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Purpose
          <select value={purpose} onChange={(event) => setPurpose(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
            <option>Consultation</option>
            <option>Second opinion</option>
          </select>
        </label>
        <Button type="submit">Generate secure access</Button>
      </form>
      {created ? (
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          Access code <span className="font-semibold">{created.access_token}</span>. Status {created.status}.
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <ul className="space-y-2 text-sm text-slate-600">
        {shares.map((share) => (
          <li key={share.id}>{share.access_token} · {share.status}</li>
        ))}
      </ul>
    </div>
  );
}
