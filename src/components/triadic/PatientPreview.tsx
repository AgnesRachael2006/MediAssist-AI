"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { ReportVoicePlayer } from "@/components/patient/ReportVoicePlayer";
import { toApprovedExplanation } from "@/lib/policy";
import type { FindingCard } from "@/lib/types";

export function PatientPreview({
  reportId,
  title,
  doctorName,
  findings,
}: {
  reportId: string;
  title: string;
  doctorName: string;
  findings: FindingCard[];
}) {
  const [language, setLanguage] = useState("en");
  const [listen, setListen] = useState(false);
  const explanation = toApprovedExplanation(reportId, title, doctorName, findings);
  const tamil = language === "ta";

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Preview patient view</p>
      <p className="mt-1 text-sm text-slate-500">
        Approved findings only. Drafts, rejected cards, and Jev notes stay on this side of the screen.
      </p>
      {!explanation ? (
        <p className="mt-4 text-sm text-slate-600">Nothing is patient-visible yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-emerald-800">Approved by {explanation.doctor_name}</p>
          <Tabs
            label="Preview language"
            value={language}
            onChange={setLanguage}
            tabs={[
              { id: "en", label: "English" },
              { id: "ta", label: "தமிழ்" },
            ]}
          />
          {explanation.results.map((result) => (
            <p key={result.test_name} className="text-sm leading-6 text-slate-800">
              <span className="font-medium">{result.test_name}. </span>
              {tamil ? result.text_ta : result.text}
            </p>
          ))}
          <p className="text-sm font-medium text-slate-900">{tamil ? explanation.notice_ta : explanation.notice}</p>
          <button type="button" className="text-sm font-medium text-indigo-700" onClick={() => setListen((open) => !open)}>
            {listen ? "Hide voice" : "Listen"}
          </button>
          {listen ? (
            <ReportVoicePlayer
              text={tamil ? explanation.voice_script_ta : explanation.voice_script}
              lang={tamil ? "ta-IN" : "en-US"}
              title="Approved explanation"
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
