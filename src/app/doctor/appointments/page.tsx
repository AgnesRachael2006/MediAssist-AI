"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { listAppointments, updateAppointment } from "@/lib/api";

export default function DoctorAppointmentsPage() {
  const [items, setItems] = useState<Array<Record<string, string>>>([]);
  const [message, setMessage] = useState("");

  function load() {
    listAppointments().then(setItems).catch((caught) => setMessage(caught instanceof Error ? caught.message : "Unable to load appointments."));
  }

  useEffect(() => {
    load();
  }, []);

  function setStatus(id: string, status: string) {
    updateAppointment(id, status).then(load).catch((caught) => setMessage(caught instanceof Error ? caught.message : "Unable to update."));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Appointments</h2>
      <p className="text-sm text-slate-500">Confirm, cancel, or complete a request. This is not a hospital calendar.</p>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      {items.length === 0 ? <p className="text-sm text-slate-500">No appointments yet.</p> : null}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-medium text-slate-900">{item.patient_name || "Patient"} · {item.appointment_date} · {item.appointment_time} · {item.status}</p>
            <p className="text-slate-600">{item.reason}</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" onClick={() => setStatus(item.id, "CONFIRMED")}>Confirm</Button>
              <Button type="button" variant="secondary" onClick={() => setStatus(item.id, "COMPLETED")}>Complete</Button>
              <Button type="button" variant="secondary" onClick={() => setStatus(item.id, "CANCELLED")}>Cancel</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
