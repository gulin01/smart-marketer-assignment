import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Badge,
  Breadcrumb,
  Card,
  CardHeader,
  ChannelTag,
  Code,
  EmptyState,
  PageHeader,
  TBody,
  THead,
  Table,
  Td,
  Th,
  formatDate,
  formatNumber,
} from "@/components/ui";
import { ChannelBars, ConversionMeter, StatTile, formatPercent } from "@/components/stats";
import { getChannelStats } from "@/lib/stats";
import FormCreate from "./form-create";
import { getTranslations } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: PageProps<"/admin/campaigns/[id]">) {
  const { id } = await params;

  const { t } = await getTranslations();
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
    prisma.htmlTemplate.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true } }),
    getChannelStats(id),
  ]);

  if (!campaign) notFound();

  const totals = channels.reduce(
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
      <Breadcrumb items={[{ label: t.campaign.title, href: "/admin/campaigns" }, { label: campaign.name }]} />
      <PageHeader title={campaign.name} description={campaign.description ?? undefined} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t.metric.visits} value={formatNumber(totals.visits)} />
        <StatTile label={t.metric.visitors} value={formatNumber(totals.visitors)} />
        <StatTile label={t.metric.submissions} value={formatNumber(totals.submissions)} />
        <StatTile label={t.metric.conversion} value={formatPercent(overall)} emphasis />
      </div>

      <Card className="mb-6 overflow-hidden">
        <CardHeader title={t.campaign.byChannel} hint={t.campaign.byChannelHint} />
        <div className="grid gap-8 p-5 lg:grid-cols-[1.4fr_1fr]">
          <Table>
            <THead>
              <tr>
                <Th>{t.submission.channel}</Th>
                <Th numeric>{t.metric.visits}</Th>
                <Th numeric>{t.metric.visitors}</Th>
                <Th numeric>{t.metric.submissions}</Th>
                <Th numeric>{t.metric.conversion}</Th>
              </tr>
            </THead>
            <TBody>
              {channels.map((row) => (
                <tr key={row.channel ?? "direct"}>
                  <Td>
                    <ChannelTag channel={row.channel} />
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

          <ChannelBars
            label={t.campaign.submissionsByChannel}
            rows={channels.map((row) => ({ channel: row.channel, value: row.submissions }))}
            emptyNote={t.campaign.noTraffic}
          />
        </div>
      </Card>

      <FormCreate campaignId={campaign.id} templates={templates} t={t.form} />

      <Card className="mt-5 overflow-hidden">
        <CardHeader title={t.form.title} hint={String(campaign.forms.length)} />
        {campaign.forms.length === 0 ? (
          <EmptyState>
            {t.form.empty}
            {templates.length === 0 && ` ${t.form.needTemplate}`}
          </EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t.form.title}</Th>
                <Th>{t.template.title}</Th>
                <Th numeric>{t.form.links}</Th>
                <Th numeric>{t.metric.submissions}</Th>
                <Th>{t.form.status}</Th>
                <Th numeric>{t.form.createdAt}</Th>
              </tr>
            </THead>
            <TBody>
              {campaign.forms.map((form) => (
                <tr key={form.id} className="transition-colors hover:bg-surface-2">
                  <Td>
                    <Link
                      href={`/admin/forms/${form.id}`}
                      className="font-medium text-ink hover:text-accent"
                    >
                      {form.title}
                    </Link>
                    <p className="mt-1">
                      <Code>/f/{form.slug}</Code>
                    </p>
                  </Td>
                  <Td className="text-ink-3">{form.template.name}</Td>
                  <Td numeric>{form._count.links}</Td>
                  <Td numeric>{form._count.submissions}</Td>
                  <Td>
                    <Badge tone={form.isActive ? "ok" : "muted"}>
                      {form.isActive ? t.form.active : t.form.inactive}
                    </Badge>
                  </Td>
                  <Td numeric className="whitespace-nowrap text-ink-3">
                    {formatDate(form.createdAt)}
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
