import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  TBody,
  THead,
  Table,
  Td,
  Th,
  formatDate,
} from "@/components/ui";
import CampaignCreate from "./campaign-create";

export const metadata = { title: "캠페인 · Lead Magnet CRM" };
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { forms: true } } },
  });

  return (
    <>
      <PageHeader
        title="캠페인"
        description="캠페인 단위로 폼을 묶고, 채널별 성과를 비교합니다."
      />

      <CampaignCreate />

      <Card className="mt-5 overflow-hidden">
        <CardHeader title="전체 캠페인" hint={`${campaigns.length}개`} />
        {campaigns.length === 0 ? (
          <EmptyState>아직 캠페인이 없습니다. 위에서 첫 캠페인을 만들어 보세요.</EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>캠페인</Th>
                <Th numeric>폼</Th>
                <Th numeric>생성일</Th>
              </tr>
            </THead>
            <TBody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="transition-colors hover:bg-surface-2">
                  <Td>
                    <Link
                      href={`/admin/campaigns/${campaign.id}`}
                      className="font-medium text-ink hover:text-accent"
                    >
                      {campaign.name}
                    </Link>
                    {campaign.description && (
                      <p className="mt-0.5 text-xs text-ink-3">{campaign.description}</p>
                    )}
                  </Td>
                  <Td numeric>{campaign._count.forms}</Td>
                  <Td numeric className="whitespace-nowrap text-ink-3">
                    {formatDate(campaign.createdAt)}
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
