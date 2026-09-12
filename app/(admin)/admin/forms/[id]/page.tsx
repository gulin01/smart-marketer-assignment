import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  AnchorButton,
  Badge,
  Breadcrumb,
  Card,
  CardHeader,
  Code,
  LinkButton,
  PageHeader,
  channelColor,
  channelLabel,
  formatNumber,
} from "@/components/ui";
import { StatTile, formatPercent } from "@/components/stats";
import { getFormMetrics } from "@/lib/stats";
import CopyLink from "./copy-link";
import { getTranslations } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function FormDetailPage({ params }: PageProps<"/admin/forms/[id]">) {
  const { id } = await params;

  const { t } = await getTranslations();
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
          { label: t.campaign.title, href: "/admin/campaigns" },
          { label: form.campaign.name, href: `/admin/campaigns/${form.campaign.id}` },
          { label: form.title },
        ]}
      />
      <PageHeader
        title={form.title}
        description={`${t.template.title} · ${form.template.name} · ${form.template.fieldNames.join(", ")}`}
        action={
          <LinkButton href={`/admin/forms/${form.id}/submissions`} variant="primary">
            {t.form.viewSubmissions}
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t.metric.visits} value={formatNumber(metrics.visits)} />
        <StatTile label={t.metric.visitors} value={formatNumber(metrics.visitors)} />
        <StatTile label={t.metric.submissions} value={formatNumber(metrics.submissions)} />
        <StatTile label={t.metric.conversion} value={formatPercent(metrics.conversionRate)} emphasis />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title={t.form.distributionLinks}
          hint={t.form.distributionHint}
          action={
            <Badge tone={form.isActive ? "ok" : "muted"}>
              {form.isActive ? t.form.active : t.form.inactive}
            </Badge>
          }
        />
        <ul className="divide-y divide-line">
          {form.links.map((link) => (
            <li key={link.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <span className="flex w-28 shrink-0 items-center gap-2 text-sm font-medium text-ink">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: channelColor(link.channel) }}
                />
                {channelLabel(link.channel)}
              </span>

              <span className="min-w-0 flex-1 basis-72 truncate">
                <Code>{link.url}</Code>
              </span>

              <span className="flex shrink-0 items-center gap-2">
                <CopyLink url={link.url} labels={{ copy: t.form.copy, copied: t.form.copied }} />
                <AnchorButton
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-2.5 py-1 text-xs"
                >
                  {t.form.open}
                </AnchorButton>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
