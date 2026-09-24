"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { ErrorState, LoadingState } from "@/components/ui/EmptyState";
import {
  listPatients,
  loadDemoPatient,
  recordMedicationDecision,
  runSafetyCheck,
} from "@/lib/api";
import { useDemoStore } from "@/lib/useDemoStore";
import type { Medication, MedicationSafetyCheck, Patient, SafetyFlagStatus } from "@/lib/types";

const STEPS = ["Patient", "Medications", "Safety Check", "Explanation", "Doctor Decision", "Audit"];

function statusCopy(status: SafetyFlagStatus) {
  if (status === "no_issue") return "No Issue Detected";
  if (status === "review_recommended") return "Review Recommended";
  return "Information Missing";
}

function StatusCard({
  title,
  status,
  summary,
}: {
  title: string;
  status: SafetyFlagStatus;
  summary: string;
}) {
  const Icon = status === "no_issue" ? CheckCircle2 : status === "review_recommended" ? AlertTriangle : Info;
  const color =
    status === "no_issue"
      ? "border-emerald-100 bg-emerald-50/60 text-emerald-950"
      : status === "review_recommended"
        ? "border-amber-100 bg-amber-50/80 text-amber-950"
        : "border-slate-200 bg-slate-50 text-slate-800";
  const mark = status === "no_issue" ? "✓" : "⚠";

  return (
    <article className={`rounded-2xl border p-4 ${color}`}>
      <div className="flex items-center gap-2">
        <Icon size={18} aria-hidden />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide">{statusCopy(status)}</p>
      <p className="mt-2 text-sm leading-6">
        {mark} {summary}
      </p>
    </article>
  );
}

export default function MedicationSafetyPage() {
  const patients = listPatients();
  const { auditLogs } = useDemoStore();
  const [step, setStep] = useState(0);
  const [patientId, setPatientId] = useState(patients[0].id);
  const [medications, setMedications] = useState<Medication[]>([
    { id: "draft-1", name: "Paracetamol", dosage: "500 mg", frequency: "Every 6 hours as needed" },
  ]);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [check, setCheck] = useState<MedicationSafetyCheck | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [decision, setDecision] = useState<"approve" | "modify" | "reject" | null>(null);

  const patient = patients.find((item) => item.id === patientId) as Patient;
  const safetyLogs = auditLogs.filter((log) => log.reportId === "safety");

  function addMedication() {
    if (!name.trim()) {
      setError("Enter a medication name.");
      return;
    }
    setError("");
    setMedications((current) => [
      ...current,
      { id: `med-${Date.now()}`, name: name.trim(), dosage: dosage.trim() || "Not specified", frequency: frequency.trim() || "Not specified" },
    ]);
    setName("");
    setDosage("");
    setFrequency("");
  }

  async function runCheck() {
    if (medications.length === 0) {
      setError("Add at least one medication before running the safety check.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const result = await runSafetyCheck({ patientId, medications });
      setCheck(result.check);
      setShowEvidence(false);
      setDecision(null);
      setStep(2);
    } catch {
      setError("Unable to complete the safety check. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(next: "approve" | "modify" | "reject") {
    setBusy(true);
    setError("");
    try {
      await recordMedicationDecision(patientId, next);
      setDecision(next);
      setStep(5);
    } catch {
      setError("Unable to record the decision. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Medication Safety Center</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review medication-related safety information before making a clinical decision.
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Safety review steps">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              disabled={index > step || (index > 1 && !check)}
              onClick={() => setStep(index)}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs font-medium disabled:cursor-default ${
                index === step
                  ? "bg-indigo-700 text-white"
                  : index < step
                    ? "bg-indigo-50 text-indigo-800"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {error ? <ErrorState title="Please try again." description={error} /> : null}
      {busy ? <LoadingState label={step >= 4 ? "Recording decision..." : "Running safety check..."} /> : null}

      {step === 0 ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Step 1 — Patient</h3>
          <label className="block text-sm font-medium text-slate-700" htmlFor="safety-patient">
            Select Patient
            <select
              id="safety-patient"
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              {patients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Patient name</dt>
              <dd className="font-medium">{patient.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Age</dt>
              <dd className="font-medium">{patient.age}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Known allergies</dt>
              <dd className="font-medium">{patient.allergies.join(", ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Current medications</dt>
              <dd className="font-medium">
                {patient.currentMedications.length
                  ? patient.currentMedications.map((item) => `${item.name} ${item.dosage}`).join(", ")
                  : "None recorded"}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                const demo = await loadDemoPatient();
                setPatientId(demo.id);
              }}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium"
            >
              Load Demo Patient
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white"
            >
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Step 2 — Medications</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Medication Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Dosage
              <input
                value={dosage}
                onChange={(event) => setDosage(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Frequency
              <input
                value={frequency}
                onChange={(event) => setFrequency(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={addMedication}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium"
          >
            + Add Medication
          </button>
          {medications.length === 0 ? (
            <p className="text-sm text-slate-500">No medications added yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {medications.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-slate-500">
                        {item.dosage} · {item.frequency}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-medium text-slate-500 hover:text-slate-800"
                      onClick={() =>
                        setMedications((current) => current.filter((entry) => entry.id !== item.id))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={runCheck}
              disabled={busy}
              className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Run Safety Check
            </button>
          </div>
        </section>
      ) : null}

      {step >= 2 && check ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Step 3 — Safety Check</h3>
          <div className="grid gap-3 lg:grid-cols-3">
            <StatusCard
              title="Drug Interaction Check"
              status={check.interaction.status}
              summary={check.interaction.summary}
            />
            <StatusCard title="Allergy Check" status={check.allergy.status} summary={check.allergy.summary} />
            <StatusCard
              title="Medication Information Check"
              status={check.information.status}
              summary={check.information.summary}
            />
          </div>
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white"
            >
              Continue to explanation
            </button>
          ) : null}
        </section>
      ) : null}

      {step >= 3 && check ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Step 4 — Explanation</h3>
          <p className="mt-2 text-sm font-medium text-slate-900">Why was this flagged?</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The system identified information that should be reviewed by the clinician.
          </p>
          <button
            type="button"
            onClick={() => setShowEvidence((value) => !value)}
            className="mt-3 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium"
            aria-expanded={showEvidence}
          >
            View Evidence
          </button>
          {showEvidence ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>{check.interaction.evidence}</li>
              <li>{check.allergy.evidence}</li>
              <li>{check.information.evidence}</li>
            </ul>
          ) : null}
          {step === 3 ? (
            <button
              type="button"
              onClick={() => setStep(4)}
              className="mt-4 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white"
            >
              Continue to doctor decision
            </button>
          ) : null}
        </section>
      ) : null}

      {step >= 4 && step < 5 ? (
        <section className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Step 5 — Doctor Confirmation Required</h3>
          <p className="mt-1 text-sm text-slate-600">
            Final medication decisions remain with the treating clinician.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("approve")}
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("modify")}
              className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Modify
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("reject")}
              className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </section>
      ) : null}

      {step === 5 && decision ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Step 6 — Audit</h3>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>Medication check performed</li>
            <li>Doctor reviewed</li>
            <li>Decision recorded: {decision}</li>
          </ul>
          <p className="text-sm text-emerald-800">
            {decision === "approve"
              ? "Approved by the treating clinician in this demo."
              : decision === "modify"
                ? "Marked for modification by the treating clinician."
                : "Rejected by the treating clinician in this demo."}
          </p>
          <AuditTimeline logs={safetyLogs.slice(-6)} />
          <Link href="/doctor/audit" className="inline-flex text-sm font-medium text-indigo-700">
            Open Audit Trail
          </Link>
        </section>
      ) : null}

      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        Prototype safety analysis only. This tool does not replace professional clinical judgment.
      </p>
    </div>
  );
}
