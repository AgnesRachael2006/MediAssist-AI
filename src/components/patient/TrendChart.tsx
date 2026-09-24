import { formatDate } from "@/lib/format";
import type { HealthTrend } from "@/lib/types";

function parseRange(range: string) {
  const match = range.replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { low: Number(match[1]), high: Number(match[2]) };
}

function rangeLabel(value: number, range: string) {
  const bounds = parseRange(range);
  if (!bounds) return "Reference range listed with the result";
  if (value < bounds.low || value > bounds.high) return "Outside the provided reference range";
  const span = bounds.high - bounds.low || 1;
  const near = span * 0.08;
  if (value - bounds.low <= near || bounds.high - value <= near) {
    return "Near the edge of the provided reference range";
  }
  return "Within the provided reference range";
}

export function TrendChart({ trend }: { trend: HealthTrend }) {
  const values = trend.points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || Math.abs(max) || 1) * 0.2;
  const low = min - pad;
  const high = max + pad || 1;
  const width = 320;
  const height = 140;
  const points = trend.points.map((point, index) => {
    const x = (index / Math.max(trend.points.length - 1, 1)) * (width - 28) + 14;
    const y = height - 18 - ((point.value - low) / (high - low || 1)) * (height - 36);
    return { x, y };
  });
  const poly = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{trend.metric}</h3>
      <p className="text-sm text-slate-500">
        Change over time · {trend.unit}
        {trend.referenceRange ? ` · Reference range ${trend.referenceRange}` : ""}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`${trend.metric} values over time. Reference range ${trend.referenceRange}.`}
      >
        <polyline fill="none" stroke="#4338ca" strokeWidth="2.5" points={poly} />
        {points.map((point, index) => (
          <circle key={trend.points[index].date} cx={point.x} cy={point.y} r="4.5" fill="#4338ca" />
        ))}
      </svg>
      <ul className="mt-2 space-y-2 text-sm text-slate-600">
        {trend.points.map((point) => (
          <li key={point.date} className="flex items-start justify-between gap-3">
            <span>{formatDate(point.date)}</span>
            <span className="text-right">
              <span className="block font-medium text-slate-900">
                {point.value.toLocaleString()} {point.unit}
              </span>
              <span className="block text-xs text-slate-500">
                {rangeLabel(point.value, point.referenceRange || trend.referenceRange)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Your previous results are shown for comparison. This chart does not interpret a trend as a
        disease.
      </p>
    </article>
  );
}
