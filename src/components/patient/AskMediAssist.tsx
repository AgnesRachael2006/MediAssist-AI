"use client";

import { FormEvent, useRef, useState } from "react";
import { Send } from "lucide-react";
import { askMediAssist } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { SEED_CHAT } from "@/lib/mockData";

const SUGGESTIONS = [
  "What does this value mean?",
  "Explain my report simply",
  "What is this test for?",
  "What does hemoglobin mean?",
  "What does WBC mean?",
  "What does platelet count mean?",
];

export function AskMediAssist({
  reportTitle,
  compact = false,
}: {
  reportTitle?: string;
  compact?: boolean;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    reportTitle ? [] : SEED_CHAT,
  );


  async function send(text: string) {
    const question = text.trim();
    if (!question) return;
    sequence.current += 1;
    const userMessage: ChatMessage = {
      id: `u-${sequence.current}`,
      role: "user",
      content: question,
      createdAt: "",
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setBusy(true);
    try {
      const reply = await askMediAssist(question, reportTitle);
      setMessages((current) => [...current, reply]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `err-${sequence.current}`,
          role: "assistant",
          content: "Unable to load a reply. Please try again.",
          createdAt: "",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await send(input);
  }

  return (
    <section className={`flex h-full flex-col ${compact ? "" : "min-h-[28rem]"}`}>
      {reportTitle ? (
        <p className="mb-3 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
          Discussing: {reportTitle}
        </p>
      ) : null}
      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">
            Ask a question about medical terms or what a test measures.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                message.role === "user"
                  ? "ml-auto bg-indigo-700 text-white"
                  : "bg-slate-50 text-slate-800"
              }`}
            >
              {message.content}
            </div>
          ))
        )}
        {busy ? <p className="text-sm text-slate-500">Generating explanation...</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => send(item)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            {item}
          </button>
        ))}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="ask-input">
          Ask something about your report
        </label>
        <input
          id="ask-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-base outline-none ring-indigo-200 focus:ring-2"
          placeholder="Ask something about your report..."
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          <Send size={16} /> Send
        </button>
      </form>
      <p className="mt-3 text-xs text-slate-500">
        MediAssist provides educational explanations. Your doctor makes clinical decisions.
      </p>
    </section>
  );
}
