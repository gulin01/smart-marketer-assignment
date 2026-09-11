import type { ReactNode } from "react";

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function MetricCell({ value }: { value: number }) {
  return <td className="px-4 py-3 tabular-nums text-neutral-700 dark:text-neutral-300">{value.toLocaleString("ko-KR")}</td>;
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

/**
 * Small horizontal bar chart. Built from divs rather than a charting library —
 * four channels of one metric does not justify the dependency (ADR 0008).
 */
export function BarChart({
  rows,
  label,
}: {
  rows: { key: string; label: string; value: number }[];
  label: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-neutral-600 dark:text-neutral-400">{row.label}</span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded bg-neutral-900 transition-[width] dark:bg-neutral-100"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
              {row.value.toLocaleString("ko-KR")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
