"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadDropzone } from "@/components/reports/UploadDropzone";
import { ReportTable } from "@/components/reports/ReportTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { analyzeReport, uploadReport } from "@/lib/api";
import { useDemoStore } from "@/lib/useDemoStore";
import { useToast } from "@/components/ui/Toast";

const STEPS = [
  { id: "uploading", label: "Uploading..." },
  { id: "extracting", label: "Extracting report..." },
  { id: "analyzing", label: "Analyzing report..." },
  { id: "ready", label: "Analysis Ready" },
] as const;

type Phase = (typeof STEPS)[number]["id"] | "idle" | "error";

export default function DoctorReportsPage() {
  const { reports } = useDemoStore();
  const { notify } = useToast();
  const router = useRouter();
  const [step, setStep] = useState<Phase>("idle");

  async function runPipeline(fileName: string) {
    try {
      setStep("uploading");
      await new Promise((resolve) => setTimeout(resolve, 450));
      setStep("extracting");
      const report = await uploadReport(fileName);
      setStep("analyzing");
      await analyzeReport(report.id);
      setStep("ready");
      notify("Analysis complete");
      router.push(`/doctor/reports/${report.id}`);
    } catch {
      setStep("error");
      notify("Analysis failed", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Clinical Reports</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload and review patient medical reports with AI-assisted analysis.
        </p>
      </div>

      <UploadDropzone
        busy={step !== "idle" && step !== "error" && step !== "ready"}
        onUpload={(fileName) => runPipeline(fileName)}
        onDemo={() => runPipeline("Demo-CBC-Arun-Kumar.pdf")}
        onInvalid={() => {
          setStep("error");
          notify("Please choose a PDF report.", "error");
        }}
      />

      {step !== "idle" && step !== "error" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" role="status">
          <ol className="grid gap-2 sm:grid-cols-4">
            {STEPS.map((item) => {
              const active = item.id === step;
              const done = STEPS.findIndex((entry) => entry.id === step) > STEPS.findIndex((entry) => entry.id === item.id);
              return (
                <li
                  key={item.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    active
                      ? "bg-indigo-700 font-medium text-white"
                      : done
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-50 text-slate-500"
                  }`}
                >
                  {item.label}
                </li>
              );
            })}
          </ol>
          <div className="mt-3">
            <LoadingState label={STEPS.find((item) => item.id === step)?.label ?? "Working..."} />
          </div>
        </div>
      ) : null}
      {step === "error" ? (
        <ErrorState
          title="Unable to load report."
          description="Analysis failed or the file was not a PDF. Please try again with the demo report."
        />
      ) : null}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent Reports</h3>
        {reports.length === 0 ? (
          <EmptyState title="No reports found" description="Upload a file or use the demo report." />
        ) : (
          <ReportTable reports={reports} actionHref={(id) => `/doctor/reports/${id}`} />
        )}
      </section>
    </div>
  );
}
