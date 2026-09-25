"use client";

import Link from "next/link";
import { listHandoffs } from "@/lib/api";
import { useEffect, useState } from "react";
import type { ClinicalHandoff } from "@/lib/types";

export default function HandoffsPage() {
  const [items, setItems] = useState<ClinicalHandoff[]>([]);

  useEffect(() => {
    listHandoffs().then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-900">Handoffs</h2>
      {items.length === 0 ? <p className="text-sm text-slate-500">No handoff packs yet.</p> : null}
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <p className="font-semibold">{item.reason}</p>
          <p className="mt-1 text-slate-600">{item.status}</p>
          <Link className="mt-2 inline-flex text-indigo-700" href={`/doctor/patients/${item.patient_id}/handoff`}>
            Open pack
          </Link>
        </article>
      ))}
    </div>
  );
}
