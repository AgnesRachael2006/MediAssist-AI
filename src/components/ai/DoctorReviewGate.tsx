"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { DoctorReview, DoctorReviewStatus } from "@/lib/types";

interface DoctorReviewGateProps {
  current?: DoctorReview | null;
  onSubmit: (input: {
    status: Exclude<DoctorReviewStatus, "pending">;
    decisionNote: string;
    editedFinding?: string;
  }) => Promise<void>;
}

export function DoctorReviewGate({ current, onSubmit }: DoctorReviewGateProps) {
  const [editing, setEditing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState(
    current?.decisionNote ?? "Findings suggest reviewing fever history and platelet trend.",
  );
  const [editedFinding, setEditedFinding] = useState(
    current?.editedFinding ??
      "Platelet count is near the lower end of the provided reference range.",
  );
  const [busy, setBusy] = useState(false);
  const [recorded, setRecorded] = useState(Boolean(current));

  async function submit(status: Exclude<DoctorReviewStatus, "pending">) {
    setBusy(true);
    await onSubmit({
      status,
      decisionNote: note,
      editedFinding: status === "modified" ? editedFinding : undefined,
    });
    setBusy(false);
    setRecorded(true);
    setEditing(false);
    setRejectOpen(false);
  }

  return (
    <section className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Doctor Review Required</h2>
      <p className="mt-1 text-sm text-slate-600">
        AI-generated insights are suggestions only. The doctor must review and make the final
        clinical decision.
      </p>
      {editing ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Edited clinical note
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-indigo-200 focus:ring-2"
              rows={3}
              value={editedFinding}
              onChange={(event) => setEditedFinding(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Decision note
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-indigo-200 focus:ring-2"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => submit("modified")}
              className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
            >
              Save modified insight
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => submit("accepted")}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Check size={16} /> Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
          >
            <Pencil size={16} /> Edit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setRejectOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
          >
            <X size={16} /> Reject
          </button>
        </div>
      )}
      {recorded ? (
        <p className="mt-4 rounded-xl bg-white px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">
          Decision recorded successfully.
        </p>
      ) : null}
      <Modal
        open={rejectOpen}
        title="Reject AI insight?"
        onClose={() => setRejectOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => submit("rejected")}
              className="rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white"
            >
              Confirm reject
            </button>
          </>
        }
      >
        Rejected insights will not be shown to the patient. This action is captured in the audit
        trail.
      </Modal>
    </section>
  );
}
