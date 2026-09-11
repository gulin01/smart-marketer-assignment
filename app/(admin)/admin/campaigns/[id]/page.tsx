import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Breadcrumb, Card, EmptyState, PageHeader, formatDate } from "@/components/ui";
import { BarChart, MetricCell, formatPercent } from "@/components/stats";
import { getChannelStats } from "@/lib/stats";
import FormCreate from "./form-create";

const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  X: "X",
  YOUTUBE: "YouTube",
  THREADS: "Threads",
};

const channelLabel = (channel: string | null) =>
  channel ? (CHANNEL_LABELS[channel] ?? channel) : "직접 유입";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: PageProps<"/admin/campaigns/[id]">) {
  const { id } = await params;

  const [campaign, templates, channels] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id },
      include: {
        forms: {
          orderBy: { createdAt: "desc" },
          include: {
            template: { select: { name: true } },
            _count: { select: { links: true, submissions: true } },
          },
        },
      },
    }),
    prisma.htmlTemplate.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
    getChannelStats(id),
  ]);

  if (!campaign) notFound();

  return (
    <>
      <Breadcrumb items={[{ label: "캠페인", href: "/admin/campaigns" }, { label: campaign.name }]} />
      <PageHeader title={campaign.name} description={campaign.description ?? undefined} />

      <Card className="mb-6 overflow-hidden">
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">채널별 성과</h2>
          <p className="mt-0.5 text-xs text-neutral-500">전환율 = 제출 ÷ 방문자</p>
        </div>
        <div className="grid gap-6 p-4 lg:grid-cols-2">
          <table className="h-fit w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="pb-2 font-medium">채널</th>
                <th className="pb-2 font-medium">방문</th>
                <th className="pb-2 font-medium">방문자</th>
                <th className="pb-2 font-medium">제출</th>
                <th className="pb-2 font-medium">전환율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {channels.map((row) => (
                <tr key={row.channel ?? "direct"}>
                  <td className="py-2.5 pr-4 font-medium">{channelLabel(row.channel)}</td>
                  <MetricCell value={row.visits} />
                  <MetricCell value={row.visitors} />
                  <MetricCell value={row.submissions} />
                  <td className="px-4 py-2.5 font-medium tabular-nums">
                    {formatPercent(row.conversionRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <BarChart
            label="채널별 제출 수"
            rows={channels.map((row) => ({
              key: row.channel ?? "direct",
              label: channelLabel(row.channel),
              value: row.submissions,
            }))}
          />
        </div>
      </Card>

      <FormCreate campaignId={campaign.id} templates={templates} />

      <Card className="mt-6 overflow-hidden">
        {campaign.forms.length === 0 ? (
          <EmptyState>
            아직 폼이 없습니다. {templates.length === 0 && "먼저 HTML 템플릿을 업로드하세요."}
          </EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
              <tr>
                <th className="px-4 py-2.5 font-medium">폼</th>
                <th className="px-4 py-2.5 font-medium">템플릿</th>
                <th className="px-4 py-2.5 font-medium">배포 링크</th>
                <th className="px-4 py-2.5 font-medium">제출</th>
                <th className="px-4 py-2.5 font-medium">상태</th>
                <th className="px-4 py-2.5 font-medium">생성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {campaign.forms.map((form) => (
                <tr key={form.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-950">
                  <td className="px-4 py-3">
                    <Link href={`/admin/forms/${form.id}`} className="font-medium hover:underline">
                      {form.title}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-neutral-500">/f/{form.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{form.template.name}</td>
                  <td className="px-4 py-3 text-neutral-500">{form._count.links}개</td>
                  <td className="px-4 py-3 text-neutral-500">{form._count.submissions}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        form.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      }`}
                    >
                      {form.isActive ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(form.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
