import type { ReactNode } from "react";
import { channelColor, channelLabel, formatNumber } from "./ui";

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/**
 * A headline number. Deliberately not a chart — a single magnitude with no
 * comparison reads faster as text than as any plot.
 */
export function StatTile({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4">
      <p className="text-xs font-medium text-ink-3">{label}</p>
      <p
        className={`mt-1.5 text-[28px] leading-none font-semibold tnum ${
          emphasis ? "text-accent" : "text-ink"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function MetricCell({ value }: { value: number }) {
  return <td className="px-5 py-3 text-right tnum text-ink-2">{formatNumber(value)}</td>;
}

/**
 * Horizontal bars for comparing one measure across the four channels.
 *
 * Mark spec: thin bars anchored to a shared baseline, rounded only on the data
 * end, every bar directly labelled with its value. The direct labels are also
 * what licenses this palette on the light surface — two of its four hues fall
 * below 3:1 against white, and visible labels are the required relief.
 */
export function ChannelBars({
  rows,
  label,
  emptyNote,
}: {
  rows: { channel: string | null; value: number }[];
  label: string;
  emptyNote?: string;
}) {
  const max = Math.max(...rows.map((row) => row.value));
  const allZero = max === 0;

  return (
    <figure className="m-0">
      <figcaption className="mb-4 text-xs font-medium text-ink-3">{label}</figcaption>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const width = allZero ? 0 : (row.value / max) * 100;
          return (
            <li key={row.channel ?? "direct"} className="flex items-center gap-3">
              <span className="flex w-24 shrink-0 items-center gap-2 text-xs text-ink-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ background: channelColor(row.channel) }}
                />
                <span className="truncate">{channelLabel(row.channel)}</span>
              </span>

              <span className="relative h-2.5 flex-1 overflow-hidden rounded-[3px] bg-surface-3">
                <span
                  className="absolute inset-y-0 left-0 rounded-r-[4px]"
                  style={{ width: `${width}%`, background: channelColor(row.channel) }}
                />
              </span>

              <span className="w-9 shrink-0 text-right text-xs tnum text-ink-2">
                {formatNumber(row.value)}
              </span>
            </li>
          );
        })}
      </ul>
      {allZero && emptyNote && <p className="mt-4 text-xs text-ink-3">{emptyNote}</p>}
    </figure>
  );
}

/**
 * Conversion shown as a proportion of its own visitors, so a small campaign with
 * a high rate is not visually outranked by a large one with a low rate.
 */
export function ConversionMeter({ ratio }: { ratio: number }) {
  const width = Math.min(1, ratio) * 100;
  return (
    <span className="flex items-center justify-end gap-2.5">
      <span className="h-1.5 w-14 overflow-hidden rounded-[2px] bg-surface-3">
        <span
          className="block h-full rounded-r-[3px] bg-accent"
          style={{ width: `${width}%` }}
        />
      </span>
      <span className="w-12 text-right tnum font-medium text-ink">{formatPercent(ratio)}</span>
    </span>
  );
}
