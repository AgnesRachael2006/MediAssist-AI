"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, Pencil, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/format";
import type { AIInsight, DoctorReview, DoctorReviewStatus } from "@/lib/types";

export function CrossCheck({
  insight,
  review,
  onDecision,
}: {
  insight: AIInsight;
  review: DoctorReview | null;
  onDecision?: (input: {
    status: Exclude<DoctorReviewStatus, "pending">;
    decisionNote: string;
    editedFinding?: string;
  }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState(
    review?.decisionNote ?? "Findings suggest reviewing clinical history and platelet trend.",
  );
  const [editedFinding, setEditedFinding] = useState(
    review?.editedFinding ?? insight.finding,
  );
  const [busy, setBusy] = useState(false);

  const decisionLabel =
    !review || review.status === "pending"
      ? "Pending Review"
      : review.status === "accepted"
        ? "Approved by Doctor"
        : review.status === "modified"
          ? "Modified by Doctor"
          : "Rejected by Doctor";

  async function submit(status: Exclude<DoctorReviewStatus, "pending">) {
    if (!onDecision) return;
    setBusy(true);
    await onDecision({
      status,
      decisionNote: note,
      editedFinding: status === "modified" ? editedFinding : undefined,
    });
    setBusy(false);
    setEditing(false);
    setRejectOpen(false);
  }

  return (
    <section className="rounded-2xl border-2 border-indigo-200 bg-white p-5 shadow-md ring-4 ring-indigo-50">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-700 text-white">
          <ArrowLeftRight size={18} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">AI ↔ Doctor Cross-Check</h2>
          <p className="text-sm text-slate-500">
            AI assists. The doctor decides. This comparison is recorded in the audit trail.
          </p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            AI Clinical Insight
          </p>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Finding</dt>
              <dd className="font-medium text-slate-900">{insight.finding}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Evidence</dt>
              <dd>{insight.evidence}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Evidence Strength</dt>
              <dd>
                <StatusBadge kind="strength" value={insight.evidenceStrength} />
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Doctor Decision
          </p>
          <p className="mt-3 text-base font-semibold text-slate-900">{decisionLabel}</p>
          {review?.decisionNote ? (
            <p className="mt-2 text-sm text-slate-600">{review.decisionNote}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Pending Review</p>
          )}
          {onDecision ? (
            editing ? (
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Edited finding
                  <textarea
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
                    rows={3}
                    value={editedFinding}
                    onChange={(event) => setEditedFinding(event.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Decision note
                  <textarea
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
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
                    className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-medium text-white"
                  >
                    Save
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
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
                >
                  <Check size={16} /> Accept
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-medium text-white"
                >
                  <Pencil size={16} /> Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRejectOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white"
                >
                  <X size={16} /> Reject
                </button>
              </div>
            )
          ) : null}
        </div>
      </div>
      {review && review.status !== "pending" ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Audit entry recorded: {decisionLabel} · {formatDateTime(review.recordedAt)}
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
              Reject
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
