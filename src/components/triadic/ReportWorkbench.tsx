"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClinicalGraph } from "@/components/triadic/ClinicalGraph";
import { ClinicalTimeline } from "@/components/triadic/ClinicalTimeline";
import { DecisionPanel } from "@/components/triadic/DecisionPanel";
import { FindingCardView } from "@/components/triadic/FindingCardView";
import { PatientPreview } from "@/components/triadic/PatientPreview";
import { SourceViewer } from "@/components/triadic/SourceViewer";
import { SystemStatus } from "@/components/triadic/SystemStatus";
import { WorkflowStatus } from "@/components/triadic/WorkflowStatus";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { countPipeline, needsDoctorReview } from "@/lib/cbcDemo";
import { buildKnowledgeGraph } from "@/lib/clinicalContext";
import { getPatientById } from "@/lib/mockData";
import { useDemoStore } from "@/lib/useDemoStore";

export function ReportWorkbench({ reportId }: { reportId: string }) {
  const { reports, findings, sourceLines, system, visits, observations, allergies, safetyChecks } = useDemoStore();
  const search = useSearchParams();
  const report = reports.find((item) => item.id === reportId);
  const rows = findings.filter((finding) => finding.report_id === reportId);
  const reviewRows = rows.filter(needsDoctorReview);
  const routineRows = rows.filter((finding) => !needsDoctorReview(finding));
  const [showRoutine, setShowRoutine] = useState(false);
  const [tab, setTab] = useState("review");
  const [selectedId, setSelectedId] = useState(search.get("finding") || "f-hb");
  const visible = showRoutine ? [...reviewRows, ...routineRows] : reviewRows;
  const selected = rows.find((finding) => finding.id === selectedId) ?? visible[0] ?? null;
  const counts = countPipeline(rows);

  if (!report) {
    return <ErrorState title="Unable to load report." description="Please try again." />;
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No rows extracted yet."
        description="Open the demo CBC report to load the synthetic extract."
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
          lines={sourceLines.filter((line) => line.report_id === reportId)}
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
          {selected ? <DecisionPanel key={selected.id} finding={selected} /> : null}
          <PatientPreview
            reportId={reportId}
            title={report.title}
            doctorName="Dr. Priya"
            findings={rows}
          />
        </div>
      </div>
      ) : null}
    </div>
  );
}
