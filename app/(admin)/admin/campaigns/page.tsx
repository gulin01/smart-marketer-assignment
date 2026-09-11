import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, EmptyState, PageHeader, formatDate } from "@/components/ui";
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
      <PageHeader title="캠페인" description="캠페인 단위로 폼을 묶고 성과를 비교합니다." />
      <CampaignCreate />

      <Card className="mt-6 overflow-hidden">
        {campaigns.length === 0 ? (
          <EmptyState>아직 캠페인이 없습니다.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
              <tr>
                <th className="px-4 py-2.5 font-medium">캠페인</th>
                <th className="px-4 py-2.5 font-medium">폼 수</th>
                <th className="px-4 py-2.5 font-medium">생성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-950">
                  <td className="px-4 py-3">
                    <Link href={`/admin/campaigns/${campaign.id}`} className="font-medium hover:underline">
                      {campaign.name}
                    </Link>
                    {campaign.description && (
                      <p className="mt-0.5 text-xs text-neutral-500">{campaign.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{campaign._count.forms}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(campaign.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
