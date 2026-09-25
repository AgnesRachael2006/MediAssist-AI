"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { getHealthVault, getLanguage, listAppointments, listMyRecommendations, listMyReminders, setLanguage, uploadDocument } from "@/lib/api";

export default function HealthVaultPage() {
  const [vault, setVault] = useState<Awaited<ReturnType<typeof getHealthVault>> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [followUps, setFollowUps] = useState<Array<{ id: string; text: string }>>([]);
  const [appointments, setAppointments] = useState<Array<Record<string, string>>>([]);
  const [reminders, setReminders] = useState<Array<Record<string, string>>>([]);
  const [language, setLanguageChoice] = useState("en");

  function load() {
    return getHealthVault()
      .then(setVault)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load your record."));
  }

  useEffect(() => {
    void load();
    listMyRecommendations().then(setFollowUps).catch(() => setFollowUps([]));
    listAppointments().then(setAppointments).catch(() => setAppointments([]));
    listMyReminders().then(setReminders).catch(() => setReminders([]));
    getLanguage().then((item) => setLanguageChoice(item.language)).catch(() => setLanguageChoice("en"));
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setNotice("Please choose a PDF.");
      return;
    }
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await uploadDocument(file);
      await load();
      setNotice("Report added. The summary below is AI-assisted and is not a diagnosis.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Unable to read this PDF.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState title="Unable to load your health vault." description={error} />;
  if (!vault) return <LoadingState label="Loading your health vault..." />;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Your health vault</h2>
        <p className="mt-1 text-sm text-slate-500">Upload a PDF to add a report. An AI summary is prepared for your doctor. You see it, and you can share it, only after the doctor publishes it.</p>
        <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-indigo-700 px-4 text-sm font-medium text-white hover:bg-indigo-800">
          {busy ? "Reading the report..." : "Upload report"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={busy}
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </label>
        {notice ? <p className="mt-3 text-sm text-slate-700">{notice}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {["en", "ta", "kn", "hi", "te", "ml"].map((code) => (
            <button
              key={code}
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium ${language === code ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700"}`}
              onClick={() => void setLanguage(code).then(() => setLanguageChoice(code)).catch(() => setNotice("Language preference could not be saved."))}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </section>
      <VaultBlock title="Follow-up" body={followUps.map((item) => item.text).join("\n") || "No doctor-approved follow-up is published."} />
      <VaultBlock title="Upcoming appointments" body={appointments.map((item) => `${item.appointment_date} · ${item.appointment_time} · ${item.status}`).join("\n") || "No appointments yet."} />
      <VaultBlock title="Medication reminders" body={reminders.map((item) => `${item.reminder_time} · ${item.name}`).join("\n") || "No approved reminders yet."} />
      <VaultBlock title="Recent visits" body={vault.visits.map((item) => `${item.date} · ${item.label}`).join("\n") || "No visits yet."} />
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Medical reports</h3>
        {vault.reports.length === 0 ? <p className="mt-2 text-sm text-slate-700">No reports yet.</p> : null}
        <div className="mt-3 space-y-3">
          {vault.reports.map((item) => (
            <article key={item.id} className="rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-900">{item.title}</p>
              {item.summary ? (
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  <span className="font-medium text-indigo-800">AI-assisted summary. </span>
                  {item.summary}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No summary has been saved for this report.</p>
              )}
            </article>
          ))}
        </div>
      </section>
      <VaultBlock
        title="Important findings"
        body={
          vault.findings.length
            ? vault.findings.map((item) => ("text" in item ? `${item.test_name}: ${item.text}` : item.test_name)).join("\n")
            : "Approved findings will appear after your doctor reviews them."
        }
      />
      <VaultBlock
        title="Trends"
        body={vault.trends.length ? vault.trends.map((item) => `${item.metric}: ${item.previous} → ${item.current} (${item.delta})`).join("\n") : "Trends appear after a dated series is available."}
      />
      <VaultBlock title="Medications" body={vault.medications.map((item) => item.medication).join(", ") || "None approved for this view."} />
      <VaultBlock title="Allergies" body={vault.allergies.map((item) => item.substance).join(", ") || "None shared in this view."} />
      <VaultBlock title="Doctors with access" body={vault.doctors.map((item) => `${item.name} · ${item.access}`).join("\n")} />
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <h3 className="font-semibold text-slate-900">Shared records</h3>
        <Link className="mt-2 inline-flex text-indigo-700" href="/patient/share">Share my health record</Link>
      </section>
    </div>
  );
}

function VaultBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{body}</p>
    </section>
  );
}
