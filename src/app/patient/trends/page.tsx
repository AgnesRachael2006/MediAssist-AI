"use client";

import { TrendChart } from "@/components/patient/TrendChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { trendSentence } from "@/lib/policy";
import { useDemoStore } from "@/lib/useDemoStore";

export default function TrendsPage() {
  const { trends } = useDemoStore();
  if (trends.length === 0) {
    return (
      <EmptyState
        title="No trend available yet."
        description="Another recorded result is needed before a comparison can be shown."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-base text-slate-600">
        Values come from stored results. A change is described as a number, not as a disease.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {trends.map((series) => {
          const current = series.points.at(-1);
          const previous = series.points.at(-2);
          return (
            <div key={series.metric} className="space-y-2">
              <TrendChart
                trend={{
                  metric: series.metric,
                  unit: series.unit,
                  referenceRange: "",
                  points: series.points.map((point) => ({
                    date: point.date,
                    value: point.value,
                    unit: series.unit,
                    referenceRange: "",
                  })),
                }}
              />
              {current && previous ? (
                <p className="px-1 text-sm leading-6 text-slate-700">
                  Current: {current.value} {series.unit}. Previous: {previous.value} {series.unit}.{" "}
                  {trendSentence(series.metric, series.unit, current.value, previous.value)}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
