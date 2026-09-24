"use client";

import { Suspense, use } from "react";
import { ReportWorkbench } from "@/components/triadic/ReportWorkbench";
import { LoadingState } from "@/components/ui/EmptyState";

export default function DoctorReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={<LoadingState label="Opening the report..." />}>
      <ReportWorkbench reportId={id} />
    </Suspense>
  );
}
