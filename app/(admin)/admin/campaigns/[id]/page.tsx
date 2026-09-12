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
      <Breadcrumb items={[{ label: "캠페인", href: "/admin/campaigns" }, { label: campaign.name }]} />
      <PageHeader title={campaign.name} description={campaign.description ?? undefined} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="방문" value={formatNumber(totals.visits)} />
        <StatTile label="방문자" value={formatNumber(totals.visitors)} />
        <StatTile label="제출" value={formatNumber(totals.submissions)} />
        <StatTile label="전환율" value={formatPercent(overall)} emphasis />
      </div>

      <Card className="mb-6 overflow-hidden">
        <CardHeader title="채널별 성과" hint="어느 채널이 실제로 리드를 만들고 있는지 비교합니다." />
        <div className="grid gap-8 p-5 lg:grid-cols-[1.4fr_1fr]">
          <Table>
            <THead>
              <tr>
                <Th>채널</Th>
                <Th numeric>방문</Th>
                <Th numeric>방문자</Th>
                <Th numeric>제출</Th>
                <Th numeric>전환율</Th>
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
            label="채널별 제출 수"
            rows={channels.map((row) => ({ channel: row.channel, value: row.submissions }))}
            emptyNote="아직 제출이 없습니다. 배포 링크를 공유하면 여기에 채널별로 집계됩니다."
          />
        </div>
      </Card>

      <FormCreate campaignId={campaign.id} templates={templates} />

      <Card className="mt-5 overflow-hidden">
        <CardHeader title="폼" hint={`${campaign.forms.length}개`} />
        {campaign.forms.length === 0 ? (
          <EmptyState>
            아직 폼이 없습니다.
            {templates.length === 0 && " 먼저 HTML 템플릿을 업로드하세요."}
          </EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>폼</Th>
                <Th>템플릿</Th>
                <Th numeric>링크</Th>
                <Th numeric>제출</Th>
                <Th>상태</Th>
                <Th numeric>생성일</Th>
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
                      {form.isActive ? "활성" : "비활성"}
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
