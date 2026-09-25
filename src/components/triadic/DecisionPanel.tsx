"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { acceptFinding, editFinding, rejectFinding, rewriteFinding } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import type { FindingCard, RejectReason, RewriteStyle } from "@/lib/types";

const REASONS: { id: RejectReason; label: string }[] = [
  { id: "overclaim", label: "AI overclaim" },
  { id: "insufficient_evidence", label: "Insufficient evidence" },
  { id: "incorrect_interpretation", label: "Incorrect interpretation" },
  { id: "not_clinically_relevant", label: "Not clinically relevant" },
  { id: "duplicate", label: "Duplicate" },
  { id: "other", label: "Other" },
];

const STYLES: { id: RewriteStyle; label: string }[] = [
  { id: "patient_friendly", label: "Patient friendly" },
  { id: "concise", label: "Concise" },
  { id: "formal", label: "Formal" },
];

export function DecisionPanel({ finding, onUpdated }: { finding: FindingCard; onUpdated?: () => void }) {
  const { notify } = useToast();
  const [teachOpen, setTeachOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [wording, setWording] = useState(finding.final_text ?? finding.gemini_rewrite ?? finding.ai_draft ?? "");
  const [reason, setReason] = useState<RejectReason>(finding.jev.overclaim ? "overclaim" : "insufficient_evidence");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const publishText = (finding.gemini_rewrite ?? finding.ai_draft ?? "").trim();
  const noSource = !finding.checks.source_found || !finding.source.excerpt;
  const blockedPublish =
    noSource || (finding.jev.overclaim && publishText === (finding.ai_draft ?? "").trim());

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    try {
      await action();
      onUpdated?.();
      notify(success);
      setConfirming(false);
      setEditing(false);
      setRejecting(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">AI draft</p>
        <p className="mt-2 text-sm leading-6 text-slate-800">{finding.ai_draft}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="indigo">AI Draft</Badge>
          <Badge tone={finding.jev.triage === "routine_normal" ? "green" : "amber"}>
            Jev {finding.jev.triage.replaceAll("_", " ")}
          </Badge>
          <Badge tone="slate">Evidence {finding.jev.evidence}</Badge>
          <Badge tone={finding.doctor_decision === "pending" ? "amber" : finding.doctor_decision === "rejected" ? "red" : "green"}>
            {finding.doctor_decision === "pending"
              ? "Doctor Decision Pending"
              : finding.doctor_decision === "accepted"
                ? "Doctor Approved"
                : finding.doctor_decision === "edited"
                  ? "Doctor Edited"
                  : "Doctor Rejected"}
          </Badge>
          <Badge tone={finding.patient_visible ? "green" : "slate"}>
            {finding.patient_visible ? "Patient Visible" : "Not patient visible"}
          </Badge>
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 p-3">
        <button type="button" className="text-sm font-semibold text-slate-900" onClick={() => setWhyOpen((open) => !open)} aria-expanded={whyOpen}>
          Why this card?
        </button>
        {whyOpen ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>{finding.checks.source_found ? "✓" : "–"} Source found</li>
            <li>{finding.checks.value_extracted ? "✓" : "–"} Value extracted</li>
            <li>{finding.checks.reference_available ? "✓" : "–"} Reference range available</li>
            <li>{finding.checks.outside_range ? "✓" : "–"} Value outside supplied range</li>
            <li>{finding.checks.previous_available ? "✓" : "–"} Previous value available</li>
            <li className="pt-2 font-medium">Jev decision: {finding.jev.triage.replaceAll("_", " ").toUpperCase()}</li>
            <li className="font-medium">Evidence: {finding.jev.evidence.toUpperCase()}</li>
            {finding.jev.overclaim ? <li className="font-medium text-amber-900">Possible overclaim detected</li> : null}
          </ul>
        ) : null}
      </div>

      <div>
        <Button type="button" variant="secondary" onClick={() => setTeachOpen((open) => !open)} aria-expanded={teachOpen}>
          Why was this flagged?
        </Button>
        {teachOpen ? (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-950">Teach Mode</p>
            <p className="mt-1 text-xs text-amber-900">Flagged because:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
              {finding.teach.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-amber-950">Evidence: {finding.jev.evidence.toUpperCase()}</p>
            <p className="text-sm text-amber-950">
              Source: Page {finding.source.page} · Line {finding.source.line_start}
            </p>
          </div>
        ) : null}
      </div>

      {finding.jev.overclaim && finding.overclaim_detail ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-900">Possible overclaim</p>
          <p className="mt-2 text-sm leading-6 text-red-950">{finding.ai_draft}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Available evidence</p>
          <ul className="mt-1 space-y-1 text-sm text-slate-800">
            {finding.overclaim_detail.available.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Missing evidence</p>
          <ul className="mt-1 space-y-1 text-sm text-amber-900">
            {finding.overclaim_detail.missing.map((item) => (
              <li key={item}>⚠ {item}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={() =>
                run(
                  () => rewriteFinding(finding.id, "patient_friendly").then(() => undefined),
                  "A safer rewrite is ready. It is not visible to the patient until you approve it.",
                )
              }
            >
              Rewrite safely
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => { setReason("overclaim"); setRejecting(true); }}>
              Reject
            </Button>
          </div>
        </div>
      ) : null}

      {finding.gemini_rewrite ? (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Gemini rewrite</p>
          <p className="mt-2 text-sm leading-6 text-slate-800">{finding.gemini_rewrite}</p>
          <p className="mt-2 text-xs text-slate-500">Not published. The doctor still has to approve it.</p>
        </div>
      ) : null}

      {finding.final_text ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Doctor approved text</p>
          <p className="mt-2 text-sm leading-6 text-slate-900">{finding.final_text}</p>
          <p className="mt-2 text-xs text-emerald-900">
            {finding.doctor_decision === "edited" ? "Edited" : "Accepted"} by {finding.doctor_name}
            {finding.decided_at ? ` · ${new Date(finding.decided_at).toLocaleString("en-GB")}` : ""}
          </p>
        </div>
      ) : null}

      {finding.doctor_decision === "rejected" ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-900">
          Rejected by {finding.doctor_name}. This card is not shown to the patient.
          {finding.reject_reason ? ` Reason: ${finding.reject_reason.replaceAll("_", " ")}.` : ""}
        </div>
      ) : null}

      <div>
        <p className="text-sm font-semibold text-slate-900">Rewrite this card</p>
        <div className="mt-2 flex flex-wrap gap-2">
        {STYLES.map((style) => (
          <Button
            key={style.id}
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run(
                () => rewriteFinding(finding.id, style.id).then(() => undefined),
                "Gemini rewrite is ready for your review.",
              )
            }
          >
            {style.label}
          </Button>
        ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">Only this card is rewritten. The rest of the report is not sent.</p>

      {editing ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => editFinding(finding.id, wording).then(() => undefined), "Saved and approved.");
          }}
        >
          <Textarea label="Doctor-approved wording" rows={4} value={wording} onChange={(event) => setWording(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>Save & Approve</Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="success" disabled={busy} onClick={() => setConfirming(true)}>Accept</Button>
          <Button
            disabled={busy}
            onClick={() => {
              setWording(finding.gemini_rewrite ?? finding.final_text ?? finding.ai_draft ?? "");
              setEditing(true);
            }}
          >
            Edit
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => setRejecting(true)}>Reject</Button>
        </div>
      )}

      {confirming ? (
        <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="text-sm font-semibold text-slate-900">Confirm Accept</p>
          <p className="text-sm text-slate-700"><span className="font-medium">AI draft: </span>{finding.ai_draft}</p>
          <p className="text-sm text-slate-700"><span className="font-medium">Source: </span>Page {finding.source.page} · Line {finding.source.line_start}</p>
          <p className="text-sm text-slate-700"><span className="font-medium">Jev decision: </span>{finding.jev.triage.replaceAll("_", " ")}</p>
          {finding.gemini_rewrite ? (
            <p className="text-sm text-slate-700"><span className="font-medium">Text to publish: </span>{finding.gemini_rewrite}</p>
          ) : null}
          {blockedPublish ? (
            <p className="text-sm text-amber-900">
              {noSource
                ? "Approval is disabled because this finding has no pinned source."
                : "Policy blocked publication of this overclaim draft. Use Rewrite safely, edit the wording, or reject the card."}
            </p>
          ) : (
            <Button variant="success" disabled={busy} onClick={() => run(() => acceptFinding(finding.id).then(() => undefined), "Accepted by the doctor.")}>
              Confirm Accept
            </Button>
          )}
        </div>
      ) : null}

      {rejecting ? (
        <form
          className="space-y-3 rounded-xl border border-red-100 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () => rejectFinding(finding.id, reason, note).then(() => undefined),
              "Rejected. The patient will not see this card.",
            );
          }}
        >
          <fieldset>
            <legend className="text-sm font-medium text-slate-800">Reason</legend>
            <div className="mt-2 space-y-1">
              {REASONS.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name="reason" checked={reason === item.id} onChange={() => setReason(item.id)} />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
          <Textarea label="Optional reason text" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
          <Button type="submit" variant="danger" disabled={busy}>Confirm Reject</Button>
        </form>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {busy ? <p className="text-sm text-slate-500">Saving decision...</p> : null}
    </div>
  );
}
