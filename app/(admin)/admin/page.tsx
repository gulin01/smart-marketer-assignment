import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  TBody,
  THead,
  Table,
  Td,
  Th,
  formatNumber,
} from "@/components/ui";
import { ConversionMeter, StatTile, formatPercent } from "@/components/stats";
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
  const overall = totals.visitors === 0 ? 0 : totals.submissions / totals.visitors;

  return (
    <>
      <PageHeader
        title="대시보드"
        description="캠페인별 리드 수집 성과를 한 화면에서 비교합니다."
        action={
          <LinkButton href="/admin/campaigns" variant="primary">
            캠페인 만들기
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="방문" value={formatNumber(totals.visits)} hint="폼 페이지 로드 수" />
        <StatTile label="방문자" value={formatNumber(totals.visitors)} hint="쿠키 기준 순 방문자" />
        <StatTile label="제출" value={formatNumber(totals.submissions)} hint="수집된 리드" />
        <StatTile label="전환율" value={formatPercent(overall)} hint="제출 ÷ 방문자" emphasis />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="캠페인별 성과"
          hint={`캠페인 ${stats.length}개 · 폼 ${formCount}개 · 템플릿 ${templateCount}개`}
        />
        {stats.length === 0 ? (
          <EmptyState>
            아직 캠페인이 없습니다.{" "}
            <Link href="/admin/campaigns" className="font-medium text-accent hover:underline">
              첫 캠페인 만들기
            </Link>
          </EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>캠페인</Th>
                <Th numeric>방문</Th>
                <Th numeric>방문자</Th>
                <Th numeric>제출</Th>
                <Th numeric>전환율</Th>
              </tr>
            </THead>
            <TBody>
              {stats.map((row) => (
                <tr key={row.campaignId} className="transition-colors hover:bg-surface-2">
                  <Td>
                    <Link
                      href={`/admin/campaigns/${row.campaignId}`}
                      className="font-medium text-ink hover:text-accent"
                    >
                      {row.campaignName}
                    </Link>
                  </Td>
                  <Td numeric>{formatNumber(row.visits)}</Td>
                  <Td numeric>{formatNumber(row.visitors)}</Td>
                  <Td numeric>{formatNumber(row.submissions)}</Td>
                  <Td numeric>
                    <ConversionMeter ratio={row.conversionRate} />
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
