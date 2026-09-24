"use client";

import { Volume2 } from "lucide-react";
import { useState } from "react";
import type { PatientExplanation as Explanation } from "@/lib/types";

export function PatientExplanation({
  explanation,
  listen = true,
}: {
  explanation: Explanation;
  listen?: boolean;
}) {
  const [spoken, setSpoken] = useState(false);

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Patient-Friendly Explanation
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">
            Your Report in Simple Language
          </h2>
        </div>
        {listen ? (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.speechSynthesis) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(new SpeechSynthesisUtterance(explanation.voiceScript));
              }
              setSpoken(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Volume2 size={16} /> ▶ Play
          </button>
        ) : null}
      </div>
      {spoken ? (
        <p className="mt-2 text-xs text-slate-500">
          Audio playback is a frontend mock in this prototype.
        </p>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-slate-700">{explanation.summary}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">What this means</p>
          <p className="mt-1 text-sm text-slate-700">{explanation.whatWasFound}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">What your doctor reviewed</p>
          <p className="mt-1 text-sm text-slate-700">{explanation.whatDoctorReviewed}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">
            What you should discuss with your doctor
          </p>
          <p className="mt-1 text-sm text-slate-700">{explanation.whatToDiscuss}</p>
        </div>
      </div>
    </section>
  );
}
