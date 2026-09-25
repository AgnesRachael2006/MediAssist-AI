"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClinicalGraph } from "@/components/triadic/ClinicalGraph";
import { ClinicalTimeline } from "@/components/triadic/ClinicalTimeline";
import { DecisionPanel } from "@/components/triadic/DecisionPanel";
import { FindingCardView } from "@/components/triadic/FindingCardView";
import { PatientPreview } from "@/components/triadic/PatientPreview";
import { SourceViewer } from "@/components/triadic/SourceViewer";
import { SystemStatus } from "@/components/triadic/SystemStatus";
import { WorkflowStatus } from "@/components/triadic/WorkflowStatus";
import { ErrorState, EmptyState, LoadingState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { getFindings, getReport, getSourceLines } from "@/lib/api";
import { countPipeline, needsDoctorReview } from "@/lib/cbcDemo";
import { buildKnowledgeGraph } from "@/lib/clinicalContext";
import { getPatientById } from "@/lib/mockData";
import type { FindingCard, MedicalReport, SourceLine } from "@/lib/types";
import { useDemoStore } from "@/lib/useDemoStore";

export function ReportWorkbench({ reportId }: { reportId: string }) {
  const stored = useDemoStore();
  const search = useSearchParams();
  const live = process.env.NEXT_PUBLIC_API_MODE === "live";
  const [remote, setRemote] = useState<{ report: MedicalReport; findings: FindingCard[]; lines: SourceLine[] } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    Promise.all([getReport(reportId), getFindings(reportId), getSourceLines(reportId)])
      .then(([report, findings, lines]) => {
        if (cancelled) return;
        if (!report) {
          setLoadError("This report was not found.");
          return;
        }
        setRemote({ report, findings, lines });
      })
      .catch((caught) => {
        if (!cancelled) setLoadError(caught instanceof Error ? caught.message : "Unable to load this report.");
      });
    return () => {
      cancelled = true;
    };
  }, [live, reportId, version]);

  const report = live ? remote?.report : stored.reports.find((item) => item.id === reportId);
  const rows = live ? remote?.findings ?? [] : stored.findings.filter((finding) => finding.report_id === reportId);
  const sourceLines = live ? remote?.lines ?? [] : stored.sourceLines.filter((line) => line.report_id === reportId);
  const { system, visits, observations, allergies, safetyChecks, reports, findings } = stored;
  const reviewRows = rows.filter(needsDoctorReview);
  const routineRows = rows.filter((finding) => !needsDoctorReview(finding));
  const [showRoutine, setShowRoutine] = useState(false);
  const [tab, setTab] = useState("review");
  const [selectedId, setSelectedId] = useState(search.get("finding") || "f-hb");
  const visible = showRoutine ? [...reviewRows, ...routineRows] : reviewRows;
  const selected = rows.find((finding) => finding.id === selectedId) ?? visible[0] ?? null;
  const counts = countPipeline(rows);

  if (loadError) return <ErrorState title="Unable to load report." description={loadError} />;
  if (live && !remote) return <LoadingState label="Reading the extracted report..." />;
  if (!report) {
    return <ErrorState title="Unable to load report." description="Please try again." />;
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No rows extracted yet."
        description="The file did not contain laboratory rows the reader could pin to a source line."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Triadic Co-Review</p>
          <h2 className="text-2xl font-semibold text-slate-900">{report.fileName ?? report.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {counts.rows_extracted} rows extracted · {counts.review_needed} sent to the doctor · {counts.routine_normal} routine normal
          </p>
        </div>
        <SystemStatus status={system} />
      </div>
      <WorkflowStatus />
      <Tabs
        label="Report workspace"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "review", label: "Review" },
          { id: "history", label: "Patient History" },
          { id: "graph", label: "Clinical Graph" },
        ]}
      />
      {tab === "history" && report ? (
        <ClinicalTimeline
          visits={visits.filter((visit) => visit.patient_id === report.patientId)}
          observations={observations.filter((item) => item.patient_id === report.patientId)}
        />
      ) : null}
      {tab === "graph" && report ? (
        <ClinicalGraph
          {...buildKnowledgeGraph({
            patientId: report.patientId,
            patientName: getPatientById(report.patientId)?.name ?? "Synthetic patient",
            visits,
            allergies,
            safety: safetyChecks,
          })}
          context={{
            patient: getPatientById(report.patientId),
            visits,
            observations,
            findings,
            reports,
            allergies,
            safetyChecks,
          }}
        />
      ) : null}
      {tab === "review" ? (
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <SourceViewer
          fileName={report.fileName ?? "CBC_Report.pdf"}
          lines={sourceLines}
          finding={selected}
        />
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Finding cards</h3>
            <Button variant="secondary" onClick={() => setShowRoutine((open) => !open)}>
              {showRoutine ? "Hide routine findings" : `View routine findings (${routineRows.length})`}
            </Button>
          </div>
          {!showRoutine ? (
            <p className="text-sm text-slate-500">{routineRows.length} routine findings are collapsed.</p>
          ) : null}
          <div className="space-y-3">
            {visible.map((finding) => (
              <FindingCardView
                key={finding.id}
                finding={finding}
                selected={finding.id === selected?.id}
                onSelect={() => setSelectedId(finding.id)}
              />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {selected ? (
            <DecisionPanel
              key={`${selected.id}-${selected.doctor_decision}-${selected.gemini_rewrite ?? ""}`}
              finding={selected}
              onUpdated={() => setVersion((value) => value + 1)}
            />
          ) : null}
          <PatientPreview
            reportId={reportId}
            title={report.title}
            doctorName="Dr. Madhu"
            findings={rows}
          />
        </div>
      </div>
      ) : null}
    </div>
  );
}
