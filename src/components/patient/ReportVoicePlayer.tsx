"use client";

import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type PlayerState = "idle" | "playing" | "paused";

export function ReportVoicePlayer({
  text,
  title = "Your Report Explained",
  lang = "en-US",
}: {
  text: string;
  title?: string;
  lang?: string;
}) {
  const [state, setState] = useState<PlayerState>("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const timer = window.setInterval(() => {
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 10000);
    return () => {
      window.clearInterval(timer);
      synth.cancel();
    };
  }, [text]);

  function speak(fromStart = true) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    if (!fromStart && state === "paused") {
      synth.resume();
      setState("playing");
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.lang = lang;
    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("idle");
    utteranceRef.current = utterance;
    synth.speak(utterance);
    setState("playing");
  }

  function pause() {
    window.speechSynthesis.pause();
    setState("paused");
  }

  function stop() {
    window.speechSynthesis.cancel();
    setState("idle");
  }

  const buttonClass =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-medium";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Report voice player">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500" role="status">
            {state === "playing"
              ? "Playing report explanation..."
              : state === "paused"
                ? "Paused"
                : "Text explanation and voice explanation"}
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
          ✓ Doctor Reviewed
        </span>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-900">Text Explanation</h3>
        <p className="mt-2 text-base leading-7 text-slate-700">{text}</p>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Voice Explanation</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {state === "playing" ? (
            <button type="button" onClick={pause} className={`${buttonClass} bg-indigo-700 text-white`}>
              <Pause size={18} aria-hidden /> Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={() => speak(state !== "paused")}
              className={`${buttonClass} bg-indigo-700 text-white`}
            >
              <Play size={18} aria-hidden /> {state === "paused" ? "Resume" : "Play"}
            </button>
          )}
          <button
            type="button"
            onClick={() => speak(true)}
            className={`${buttonClass} border border-slate-200 bg-white text-slate-800`}
          >
            <RotateCcw size={18} aria-hidden /> Replay
          </button>
          <button
            type="button"
            onClick={stop}
            className={`${buttonClass} border border-slate-200 bg-white text-slate-800`}
          >
            <Square size={16} aria-hidden /> Stop
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">
        Information shown here has been reviewed by your doctor. Audio uses your browser voice.
        The written explanation above is always available.
      </p>
    </section>
  );
}
