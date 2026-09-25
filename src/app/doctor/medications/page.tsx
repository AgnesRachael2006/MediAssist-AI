"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { createMedication, createReminder, listPatientMedications } from "@/lib/api";

const PATIENT_ID = "patient-arun";

export default function DoctorMedicationsPage() {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [morning, setMorning] = useState("08:00");
  const [evening, setEvening] = useState("20:00");
  const [items, setItems] = useState<Array<Record<string, string>>>([]);
  const [message, setMessage] = useState("");

  function load() {
    listPatientMedications(PATIENT_ID)
      .then(setItems)
      .catch((caught) => setMessage(caught instanceof Error ? caught.message : "Unable to load medications."));
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const tablet = name.trim();
    if (!tablet) {
      setMessage("Enter the tablet name.");
      return;
    }
    const times = [morning, evening].map((value) => value.trim()).filter(Boolean);
    if (times.length === 0) {
      setMessage("Enter at least one reminder time.");
      return;
    }
    try {
      const saved = await createMedication({
        patientId: PATIENT_ID,
        name: tablet,
        dosage: dosage.trim(),
        frequency: times.join(", "),
        instructions: "Set by the doctor. This is not a dose change.",
      });
      for (const time of times) {
        await createReminder(saved.id, time);
      }
      setName("");
      setDosage("");
      setMessage("Saved. Agnes will see these reminder times.");
      load();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to save the tablet.");
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Medications</h2>
      <p className="text-sm text-slate-500">Agnes sees a tablet only after you save it here. MediAssist does not choose a dose.</p>
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          Tablet
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Demo tablet" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Dosage
          <input value={dosage} onChange={(event) => setDosage(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="1 tablet" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Morning reminder
            <input value={morning} onChange={(event) => setMorning(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Evening reminder
            <input value={evening} onChange={(event) => setEvening(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
        </div>
        <Button type="submit">Save tablet for Agnes</Button>
      </form>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-medium text-slate-900">{item.name}</p>
            <p className="text-slate-600">{item.dosage} · {item.frequency}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
