"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listMyRecommendations } from "@/lib/api";

export default function RecommendationsPage() {
  const [items, setItems] = useState<Array<{ id: string; text: string; recommended_specialty?: string }>>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    listMyRecommendations()
      .then(setItems)
      .catch((caught) => setMessage(caught instanceof Error ? caught.message : "Unable to load recommendations."));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Follow-up</h2>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      {items.length === 0 ? <p className="text-sm text-slate-500">No doctor-approved follow-up is published.</p> : null}
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
          <p className="text-slate-800">{item.text}</p>
          <p className="mt-1 text-slate-500">{item.recommended_specialty}</p>
          <Link className="mt-3 inline-flex text-indigo-700" href="/patient/appointments">Book appointment</Link>
        </article>
      ))}
    </div>
  );
}
