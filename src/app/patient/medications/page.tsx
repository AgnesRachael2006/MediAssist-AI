"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { listMyReminders, markReminderTaken } from "@/lib/api";

export default function MedicationsPage() {
  const [items, setItems] = useState<Array<Record<string, string>>>([]);
  const [message, setMessage] = useState("");

  function load() {
    listMyReminders().then(setItems).catch((caught) => setMessage(caught instanceof Error ? caught.message : "Unable to load reminders."));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Today&apos;s medication</h2>
      <p className="text-sm text-slate-500">Only a doctor-approved schedule is shown. MediAssist does not change a dose.</p>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      {items.length === 0 ? <p className="text-sm text-slate-500">No approved reminders yet.</p> : null}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <div>
              <p className="font-medium text-slate-900">{item.reminder_time} · {item.name}</p>
              <p className="text-slate-600">{item.dosage} · {item.instructions}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={item.status === "taken"}
              onClick={() => void markReminderTaken(item.id).then(load).catch((caught) => setMessage(caught instanceof Error ? caught.message : "Unable to update."))}
            >
              {item.status === "taken" ? "Taken" : "Mark as taken"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
