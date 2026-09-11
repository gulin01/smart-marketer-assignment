import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { MetricCell, StatTile, formatPercent } from "@/components/stats";
import { getCampaignStats } from "@/lib/stats";

export const metadata = { title: "대시보드 · Lead Magnet CRM" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, formCount, templateCount] = await Promise.all([
    getCampaignStats(),
    prisma.form.count(),
    prisma.htmlTemplate.count(),
  ]);

  const totals = stats.reduce(
    (acc, row) => ({
      visits: acc.visits + row.visits,
      visitors: acc.visitors + row.visitors,
      submissions: acc.submissions + row.submissions,
    }),
    { visits: 0, visitors: 0, submissions: 0 },
  );
  const overallConversion = totals.visitors === 0 ? 0 : totals.submissions / totals.visitors;

  return (
    <>
      <PageHeader
        title="대시보드"
        description="방문(Visit)은 폼 페이지 로드 수, 방문자(Visitor)는 쿠키 기준 순 방문자 수, 전환율은 제출 ÷ 방문자입니다."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="방문" value={totals.visits.toLocaleString("ko-KR")} />
        <StatTile label="방문자" value={totals.visitors.toLocaleString("ko-KR")} hint="쿠키 기준 순 방문자" />
        <StatTile label="제출" value={totals.submissions.toLocaleString("ko-KR")} />
        <StatTile label="전환율" value={formatPercent(overallConversion)} hint="제출 ÷ 방문자" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">캠페인별 성과</h2>
          <p className="text-xs text-neutral-500">
            캠페인 {stats.length} · 폼 {formCount} · 템플릿 {templateCount}
          </p>
        </div>
        {stats.length === 0 ? (
          <EmptyState>
            아직 캠페인이 없습니다.{" "}
            <Link href="/admin/campaigns" className="underline">
              캠페인 만들기
            </Link>
          </EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
              <tr>
                <th className="px-4 py-2.5 font-medium">캠페인</th>
                <th className="px-4 py-2.5 font-medium">방문</th>
                <th className="px-4 py-2.5 font-medium">방문자</th>
                <th className="px-4 py-2.5 font-medium">제출</th>
                <th className="px-4 py-2.5 font-medium">전환율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {stats.map((row) => (
                <tr key={row.campaignId} className="hover:bg-neutral-50 dark:hover:bg-neutral-950">
                  <td className="px-4 py-3">
                    <Link href={`/admin/campaigns/${row.campaignId}`} className="font-medium hover:underline">
                      {row.campaignName}
                    </Link>
                  </td>
                  <MetricCell value={row.visits} />
                  <MetricCell value={row.visitors} />
                  <MetricCell value={row.submissions} />
                  <td className="px-4 py-3 font-medium tabular-nums">{formatPercent(row.conversionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
