"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReportVoicePlayer } from "@/components/patient/ReportVoicePlayer";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { CBC_REPORT_ID } from "@/lib/cbcDemo";
import { getDoctorById } from "@/lib/mockData";
import { toApprovedExplanation } from "@/lib/policy";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";

function VoiceInner() {
  const params = useSearchParams();
  const { patientId } = usePatientSession();
  const { reports, findings } = useDemoStore();
  const reportId = params.get("report") ?? CBC_REPORT_ID;
  const initial = params.get("lang") === "ta" ? "ta" : "en";
  const [language, setLanguage] = useState(initial);
  const report = reports.find((item) => item.id === reportId && item.patientId === patientId);
  const explanation = report
    ? toApprovedExplanation(report.id, report.title, getDoctorById(report.doctorId)?.name ?? "your doctor", findings)
    : null;

  if (!explanation) {
    return (
      <EmptyState
        title="No approved explanation to read aloud."
        description="Voice plays only after your doctor publishes the wording."
      />
    );
  }

  const script = language === "ta" ? explanation.voice_script_ta : explanation.voice_script;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Report voice</h1>
        <p className="mt-1 text-base text-slate-600">Voice is reading your doctor-approved explanation.</p>
      </div>
      <Tabs
        label="Voice language"
        value={language}
        onChange={setLanguage}
        tabs={[
          { id: "en", label: "English" },
          { id: "ta", label: "தமிழ்" },
        ]}
      />
      <ReportVoicePlayer key={script} text={script} title={explanation.title} lang={language === "ta" ? "ta-IN" : "en-US"} />
    </div>
  );
}

export default function ReportVoicePage() {
  return (
    <Suspense>
      <VoiceInner />
    </Suspense>
  );
}
