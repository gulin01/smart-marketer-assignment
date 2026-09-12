import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ------------------------------------------------------------------ surfaces */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface ${className}`}>{children}</section>
  );
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
      </div>
      {action}
    </header>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && (
            <span aria-hidden className="text-ink-3/60">
              /
            </span>
          )}
          {item.href ? (
            <Link href={item.href} className="text-ink-3 transition-colors hover:text-ink">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ controls */

type ButtonVariant = "primary" | "secondary" | "ghost";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-45 disabled:hover:bg-accent",
  secondary:
    "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-3 disabled:opacity-45",
  ghost: "text-ink-2 hover:bg-surface-3 hover:text-ink disabled:opacity-45",
};

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={`${BUTTON_BASE} ${BUTTON_STYLES[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "secondary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={`${BUTTON_BASE} ${BUTTON_STYLES[variant]} ${className}`} {...props} />;
}

export function AnchorButton({
  variant = "secondary",
  className = "",
  ...props
}: ComponentProps<"a"> & { variant?: ButtonVariant }) {
  return <a className={`${BUTTON_BASE} ${BUTTON_STYLES[variant]} ${className}`} {...props} />;
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3/70 transition-colors outline-none hover:border-line-strong focus:border-accent";

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger"
    >
      <span aria-hidden className="mt-px font-semibold">
        !
      </span>
      <span>{children}</span>
    </p>
  );
}

/* -------------------------------------------------------------------- tables */

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">{children}</table>
    </div>
  );
}

export function Th({
  children,
  numeric = false,
  className = "",
}: {
  children?: ReactNode;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3 ${
        numeric ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  numeric = false,
  className = "",
}: {
  children?: ReactNode;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <td className={`px-5 py-3 align-top ${numeric ? "text-right tnum text-ink-2" : ""} ${className}`}>
      {children}
    </td>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-line bg-surface-2">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-14 text-center text-sm text-ink-3">{children}</p>;
}

/* ------------------------------------------------------------------- display */

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "muted";
}) {
  const tones = {
    neutral: "bg-surface-3 text-ink-2",
    ok: "bg-ok-soft text-ok",
    muted: "bg-surface-3 text-ink-3",
  };
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  X: "X",
  YOUTUBE: "YouTube",
  THREADS: "Threads",
};

/** Colour is bound to the channel, never to its position in a sorted list. */
export const CHANNEL_COLORS: Record<string, string> = {
  INSTAGRAM: "var(--ch-instagram)",
  X: "var(--ch-x)",
  YOUTUBE: "var(--ch-youtube)",
  THREADS: "var(--ch-threads)",
  DIRECT: "var(--ch-direct)",
};

export function channelLabel(channel: string | null) {
  return channel ? (CHANNEL_LABELS[channel] ?? channel) : "직접 유입";
}

export function channelColor(channel: string | null) {
  return CHANNEL_COLORS[channel ?? "DIRECT"] ?? CHANNEL_COLORS.DIRECT;
}

/** A swatch beside the name, so identity never rests on colour alone. */
export function ChannelTag({ channel }: { channel: string | null }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-[2px]"
        style={{ background: channelColor(channel) }}
      />
      <span className="text-ink">{channelLabel(channel)}</span>
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-ink-2">
      {children}
    </code>
  );
}

export function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

export function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}
