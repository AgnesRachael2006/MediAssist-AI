"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { askAboutReport } from "@/lib/api";
import { CBC_REPORT_ID } from "@/lib/cbcDemo";
import type { AskResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";

const SUGGESTIONS = ["What is MCV?", "What does hemoglobin mean?", "Was this different from my last report?"];

function AskInner() {
  const params = useSearchParams();
  const reportId = params.get("report") ?? CBC_REPORT_ID;
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<{ question: string; result: AskResult }[]>([]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    setQuestion("");
    try {
      const result = await askAboutReport(reportId, trimmed);
      setMessages((current) => [...current, { question: trimmed, result }]);
    } catch {
      setError("Unable to answer right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(question);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Ask MediAssist</h1>
        <p className="mt-1 text-base text-slate-600">Ask questions about your approved report.</p>
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">Questions are answered from doctor-approved notes only.</p>
        ) : (
          messages.map((message, index) => (
            <div key={`${message.question}-${index}`} className="space-y-2">
              <p className="ml-auto max-w-[90%] rounded-2xl bg-indigo-700 px-3 py-2 text-sm text-white">{message.question}</p>
              <div className="max-w-[95%] rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-800">
                <p className={message.result.allowed ? "text-emerald-800" : "text-amber-900"}>
                  {message.result.allowed ? "✓ Educational question" : "⚠ Doctor discussion required"}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{message.result.answer}</p>
              </div>
            </div>
          ))
        )}
        {busy ? <p className="text-sm text-slate-500">Checking the question...</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((item) => (
          <button key={item} type="button" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" onClick={() => void send(item)}>
            {item}
          </button>
        ))}
      </div>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="ask-question">What would you like to know?</label>
        <input
          id="ask-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What would you like to know?"
          className="min-h-12 flex-1 rounded-xl border border-slate-200 px-3 text-base"
        />
        <Button type="submit" disabled={busy}>Send</Button>
      </form>
      {error ? <ErrorState title="Please try again." description={error} /> : null}
      <p className="text-sm text-slate-500">MediAssist explains approved report wording. It does not diagnose or prescribe.</p>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense>
      <AskInner />
    </Suspense>
  );
}
