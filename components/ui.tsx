import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
      {children}
    </div>
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
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-neutral-500">{children}</p>;
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span aria-hidden>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-neutral-900 dark:hover:text-neutral-100">
              {item.label}
            </Link>
          ) : (
            <span className="text-neutral-900 dark:text-neutral-100">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  X: "X",
  YOUTUBE: "YouTube",
  THREADS: "Threads",
};

export function ChannelBadge({ channel }: { channel: string | null }) {
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
      {channel ? (CHANNEL_LABELS[channel] ?? channel) : "직접 유입"}
    </span>
  );
}

export function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
