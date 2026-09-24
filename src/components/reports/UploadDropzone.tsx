"use client";

import { useState } from "react";
import { FileText, ScanText, Sparkles, Stethoscope, Upload } from "lucide-react";

interface UploadDropzoneProps {
  onUpload: (fileName: string) => void;
  onDemo: () => void;
  onInvalid?: () => void;
  busy?: boolean;
}

export function UploadDropzone({ onUpload, onDemo, onInvalid, busy }: UploadDropzoneProps) {
  const [drag, setDrag] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      onInvalid?.();
      return;
    }
    onUpload(file.name);
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
      className={`rounded-2xl border-2 border-dashed bg-white p-8 text-center shadow-sm ${
        drag ? "border-indigo-400 bg-indigo-50/40" : "border-slate-200"
      }`}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
        <Upload size={22} />
      </div>
      <p className="mt-4 text-lg font-semibold text-slate-900">Upload Clinical Report</p>
      <p className="mt-1 text-sm text-slate-500">
        Drag and drop a PDF, or choose a file. Demo mode does not send files to a server.
      </p>
      <p className="mt-2 text-xs font-medium text-slate-500">Supported format: PDF</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-slate-600">
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
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <label className="cursor-pointer rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-800">
          {busy ? "Working..." : "Upload Report"}
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
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Use Demo Report
        </button>
      </div>
    </div>
  );
}
