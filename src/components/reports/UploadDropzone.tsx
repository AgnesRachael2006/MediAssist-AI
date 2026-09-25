"use client";

import { useState } from "react";
import { FileText, ScanText, Sparkles, Stethoscope, Upload } from "lucide-react";

interface UploadDropzoneProps {
  onUpload: (file: File) => void;
  onDemo: () => void;
  onInvalid?: () => void;
  busy?: boolean;
  phase?: string;
}

const PHASES = ["Uploading", "Extracting", "Analyzing"];

export function UploadDropzone({ onUpload, onDemo, onInvalid, busy, phase }: UploadDropzoneProps) {
  const [drag, setDrag] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      onInvalid?.();
      return;
    }
    onUpload(file);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDrag(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-8 ${
        drag ? "border-indigo-400 bg-indigo-50/40" : "border-slate-200"
      }`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
            <Upload size={20} />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">Upload document</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              Drop a PDF here, or choose a file. The server reads the text and sends each row for review.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-indigo-700 px-4 text-sm font-medium text-white hover:bg-indigo-800">
            {busy ? "Working..." : "Upload document"}
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              disabled={busy}
              onChange={(event) => handleFiles(event.target.files)}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={onDemo}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Use demo report
          </button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200">
          <FileText size={12} /> PDF Report
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200">
          <ScanText size={12} /> OCR / Text Extraction
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200">
          <Sparkles size={12} /> AI Analysis
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200">
          <Stethoscope size={12} /> Doctor Review
        </span>
      </div>
      {busy ? (
        <ol className="mt-5 grid gap-2 sm:grid-cols-3" aria-live="polite">
          {PHASES.map((item) => {
            const active = phase === item;
            const done = PHASES.indexOf(phase ?? "") > PHASES.indexOf(item);
            return (
              <li
                key={item}
                className={`rounded-xl px-3 py-2 text-sm ${
                  active ? "bg-indigo-700 font-medium text-white" : done ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-500"
                }`}
              >
                {item}
                {active ? "..." : ""}
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
