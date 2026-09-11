import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Breadcrumb, Card, PageHeader } from "@/components/ui";
import { StatTile, formatPercent } from "@/components/stats";
import { getFormMetrics } from "@/lib/stats";
import CopyLink from "./copy-link";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  X: "X",
  YOUTUBE: "YouTube",
  THREADS: "Threads",
};

export default async function FormDetailPage({ params }: PageProps<"/admin/forms/[id]">) {
  const { id } = await params;

  const [form, metrics] = await Promise.all([
    prisma.form.findUnique({
      where: { id },
      include: {
        campaign: { select: { id: true, name: true } },
        template: { select: { name: true, fieldNames: true } },
        links: { orderBy: { channel: "asc" } },
      },
    }),
    getFormMetrics(id),
  ]);

  if (!form) notFound();

  return (
    <>
      <Breadcrumb
        items={[
          { label: "캠페인", href: "/admin/campaigns" },
          { label: form.campaign.name, href: `/admin/campaigns/${form.campaign.id}` },
          { label: form.title },
        ]}
      />
      <PageHeader
        title={form.title}
        description={`템플릿: ${form.template.name} · 입력 필드: ${form.template.fieldNames.join(", ")}`}
        action={
          <Link
            href={`/admin/forms/${form.id}/submissions`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            제출 내역 보기
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="방문" value={metrics.visits.toLocaleString("ko-KR")} />
        <StatTile label="방문자" value={metrics.visitors.toLocaleString("ko-KR")} />
        <StatTile label="제출" value={metrics.submissions.toLocaleString("ko-KR")} />
        <StatTile label="전환율" value={formatPercent(metrics.conversionRate)} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">채널별 배포 링크</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            각 링크로 들어온 방문과 제출은 해당 채널로 집계됩니다.
          </p>
        </div>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {form.links.map((link) => (
            <li key={link.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="w-24 text-sm font-medium">
                {CHANNEL_LABELS[link.channel] ?? link.channel}
              </span>
              <code className="flex-1 min-w-60 truncate rounded bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800">
                {link.url}
              </code>
              <CopyLink url={link.url} />
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                열기
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
