"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { appointmentSlots, bookAppointment, listAppointments } from "@/lib/api";

export default function PatientAppointmentsPage() {
  const [items, setItems] = useState<Array<Record<string, string>>>([]);
  const [slots, setSlots] = useState<Array<Record<string, string>>>([]);
  const [message, setMessage] = useState("");

  function load() {
    listAppointments().then(setItems).catch((caught) => setMessage(caught instanceof Error ? caught.message : "Unable to load appointments."));
  }

  useEffect(() => {
    load();
    appointmentSlots("doctor-2").then(setSlots).catch((caught) => setMessage(caught instanceof Error ? caught.message : "Unable to load slots."));
  }, []);

  async function book(slot: Record<string, string>, event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      await bookAppointment({
        doctorId: slot.doctorId,
        specialty: slot.specialty || "Internal Medicine",
        appointmentDate: slot.date,
        appointmentTime: slot.time,
        reason: "Follow-up consultation",
      });
      setMessage("Appointment requested. The doctor confirms it.");
      load();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to book.");
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Appointments</h2>
      <p className="text-sm text-slate-500">These slots are stored for this demonstration. They are not a hospital scheduling system.</p>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            {item.doctor_name || "Doctor"} · {item.appointment_date} · {item.appointment_time} · {item.status}
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        {slots.map((slot) => (
          <form key={`${slot.date}-${slot.time}`} onSubmit={(event) => void book(slot, event)} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-medium text-slate-900">Dr. Madhu</p>
            <p className="text-slate-600">{slot.date} · {slot.time}</p>
            <Button className="mt-3" type="submit">Request this slot</Button>
          </form>
        ))}
      </div>
    </div>
  );
}
