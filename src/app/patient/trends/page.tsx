"use client";

import { useEffect, useState } from "react";
import { TrendChart } from "@/components/patient/TrendChart";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { getPatientHealthTrends } from "@/lib/api";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";
import type { HealthTrend } from "@/lib/types";

export default function TrendsPage() {
  const { reports } = useDemoStore();
  const { patientId } = usePatientSession();
  const [trends, setTrends] = useState<HealthTrend[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPatientHealthTrends(patientId)
      .then((value) => {
        if (!cancelled) setTrends(value);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reports, patientId]);

  if (error) {
    return <ErrorState description="Unable to load report. Please try again." />;
  }
  if (!trends) return <LoadingState label="Loading trends..." />;

  const comparable = trends.filter((trend) => trend.points.length > 1);

  if (comparable.length === 0) {
    return (
      <EmptyState
        title="No trend available yet."
        description="Upload another report to compare results over time."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-base text-slate-600">
        Change over time. Your previous results are shown for comparison. This view does not
        interpret a trend as a disease.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {comparable.map((trend) => (
          <TrendChart key={trend.metric} trend={trend} />
        ))}
      </div>
    </div>
  );
}
