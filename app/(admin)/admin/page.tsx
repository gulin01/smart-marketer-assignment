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
import { getTranslations } from "@/lib/i18n";

export const metadata = { title: "대시보드 · Lead Magnet CRM" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { t } = await getTranslations();
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
        title={t.dashboard.title}
        description={t.dashboard.description}
        action={
          <LinkButton href="/admin/campaigns" variant="primary">
            {t.campaign.create}
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t.metric.visits} value={formatNumber(totals.visits)} hint={t.metric.visitsHint} />
        <StatTile label={t.metric.visitors} value={formatNumber(totals.visitors)} hint={t.metric.visitorsHint} />
        <StatTile label={t.metric.submissions} value={formatNumber(totals.submissions)} hint={t.metric.submissionsHint} />
        <StatTile label={t.metric.conversion} value={formatPercent(overall)} hint={t.metric.conversionHint} emphasis />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title={t.dashboard.byCampaign}
          hint={t.dashboard.counts
            .replace("{campaigns}", String(stats.length))
            .replace("{forms}", String(formCount))
            .replace("{templates}", String(templateCount))}
        />
        {stats.length === 0 ? (
          <EmptyState>
            {t.dashboard.empty}{" "}
            <Link href="/admin/campaigns" className="font-medium text-accent hover:underline">
              {t.dashboard.createFirst}
            </Link>
          </EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t.campaign.title}</Th>
                <Th numeric>{t.metric.visits}</Th>
                <Th numeric>{t.metric.visitors}</Th>
                <Th numeric>{t.metric.submissions}</Th>
                <Th numeric>{t.metric.conversion}</Th>
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
