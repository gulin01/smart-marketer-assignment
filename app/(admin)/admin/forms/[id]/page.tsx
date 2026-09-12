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

export const dynamic = "force-dynamic";

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
        description={`템플릿 ${form.template.name} · 입력 필드 ${form.template.fieldNames.join(", ")}`}
        action={
          <LinkButton href={`/admin/forms/${form.id}/submissions`} variant="primary">
            제출 내역 보기
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="방문" value={formatNumber(metrics.visits)} />
        <StatTile label="방문자" value={formatNumber(metrics.visitors)} />
        <StatTile label="제출" value={formatNumber(metrics.submissions)} />
        <StatTile label="전환율" value={formatPercent(metrics.conversionRate)} emphasis />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="채널별 배포 링크"
          hint="각 링크로 들어온 방문과 제출이 해당 채널로 집계됩니다."
          action={
            <Badge tone={form.isActive ? "ok" : "muted"}>{form.isActive ? "활성" : "비활성"}</Badge>
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
                <CopyLink url={link.url} />
                <AnchorButton
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-2.5 py-1 text-xs"
                >
                  열기 ↗
                </AnchorButton>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
