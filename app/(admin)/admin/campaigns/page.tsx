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
import { getTranslations } from "@/lib/i18n";

export const metadata = { title: "캠페인 · Lead Magnet CRM" };
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const { t } = await getTranslations();
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { forms: true } } },
  });

  return (
    <>
      <PageHeader
        title={t.campaign.title}
        description={t.campaign.description}
      />

      <CampaignCreate t={t.campaign} />

      <Card className="mt-5 overflow-hidden">
        <CardHeader title={t.campaign.all} hint={String(campaigns.length)} />
        {campaigns.length === 0 ? (
          <EmptyState>{t.campaign.empty}</EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t.campaign.title}</Th>
                <Th numeric>{t.form.title}</Th>
                <Th numeric>{t.form.createdAt}</Th>
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
