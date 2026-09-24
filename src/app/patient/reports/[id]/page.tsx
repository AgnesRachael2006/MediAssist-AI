"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Tabs } from "@/components/ui/Tabs";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import { getDoctorById } from "@/lib/mockData";
import { toApprovedExplanation } from "@/lib/policy";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";

export default function PatientReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { patientId } = usePatientSession();
  const { reports, findings } = useDemoStore();
  const [language, setLanguage] = useState("en");
  const report = reports.find((item) => item.id === id && item.patientId === patientId);
  const copy = pickLanguage(language);

  if (!report) {
    return <ErrorState title="Unable to load report." description="Please try again." />;
  }

  const explanation = toApprovedExplanation(
    report.id,
    report.title,
    getDoctorById(report.doctorId)?.name ?? "your doctor",
    findings,
  );

  if (!explanation) {
    return (
      <EmptyState
        title="Nothing has been approved yet."
        description="Your doctor has not published an explanation. Draft AI text is not shown here."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{explanation.title}</h1>
        <p className="mt-1 text-sm text-emerald-700">✓ Doctor reviewed by {explanation.doctor_name}</p>
        {explanation.reviewed_at ? (
          <p className="text-sm text-slate-500">{formatDateTime(explanation.reviewed_at)}</p>
        ) : null}
      </div>
      <Tabs
        label="Explanation language"
        value={language}
        onChange={setLanguage}
        tabs={[
          { id: "en", label: "English" },
          { id: "ta", label: "தமிழ்" },
          { id: "kn", label: "ಕನ್ನಡ" },
        ]}
      />
      <Section
        title={copy("What was checked", "என்ன சோதிக்கப்பட்டது?", "ಏನನ್ನು ಪರಿಶೀಲಿಸಲಾಯಿತು?")}
        body={copy(explanation.what_was_checked, explanation.what_was_checked_ta, explanation.what_was_checked_kn)}
      />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          {copy("What your results show", "முடிவுகள் என்ன காட்டுகின்றன?", "ಫಲಿತಾಂಶಗಳು ಏನು ತೋರಿಸುತ್ತವೆ?")}
        </h2>
        <div className="mt-3 space-y-3">
          {explanation.results.map((result) => (
            <article key={result.test_name}>
              <p className="text-sm font-semibold text-slate-900">{result.test_name}</p>
              <p className="mt-1 text-base leading-7 text-slate-700">{copy(result.text, result.text_ta, result.text_kn)}</p>
            </article>
          ))}
        </div>
      </section>
      <Section
        title={copy("What was missing", "என்ன விடுபட்டது?", "ಏನು ಕಾಣೆಯಾಗಿದೆ?")}
        body={copy(explanation.what_was_missing, explanation.what_was_missing_ta, explanation.what_was_missing_kn)}
      />
      <Section
        title={copy("What to discuss with your doctor", "மருத்துவரிடம் என்ன பேசலாம்?", "ವೈದ್ಯರೊಂದಿಗೆ ಏನು ಚರ್ಚಿಸಬೇಕು?")}
        body={copy(explanation.discuss, explanation.discuss_ta, explanation.discuss_kn)}
      />
      <Section
        title={copy("Doctor review", "மருத்துவர் பரிசீலனை", "ವೈದ್ಯರ ಪರಿಶೀಲನೆ")}
        body={copy(
          `${explanation.doctor_name} approved this explanation.`,
          `${explanation.doctor_name} இந்த விளக்கத்தை அங்கீகரித்தார்.`,
          `${explanation.doctor_name} ಈ ವಿವರಣೆಯನ್ನು ಅನುಮೋದಿಸಿದ್ದಾರೆ.`,
        )}
      />
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-900">
        {copy(explanation.notice, explanation.notice_ta, explanation.notice_kn)}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/patient/report-voice?report=${report.id}&lang=${language}`} className="inline-flex min-h-11 items-center rounded-xl bg-indigo-700 px-4 text-sm font-medium text-white">
          {copy("Listen", "கேளுங்கள்", "ಕೇಳಿ")}
        </Link>
        <Link href={`/patient/ask?report=${report.id}`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-800">
          Ask MediAssist
        </Link>
      </div>
    </div>
  );
}

function pickLanguage(language: string) {
  return (english: string, tamil: string, kannada: string) => {
    if (language === "ta") return tamil;
    if (language === "kn") return kannada;
    return english;
  };
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-base leading-7 text-slate-700">{body}</p>
    </section>
  );
}
