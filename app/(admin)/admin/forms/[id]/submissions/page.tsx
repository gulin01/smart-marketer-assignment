import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  AnchorButton,
  Breadcrumb,
  Card,
  CardHeader,
  ChannelTag,
  EmptyState,
  PageHeader,
  TBody,
  THead,
  Table,
  Td,
  Th,
  formatDate,
} from "@/components/ui";
import { getTranslations } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const MAX_ROWS = 500;

export default async function FormSubmissionsPage({
  params,
}: PageProps<"/admin/forms/[id]/submissions">) {
  const { id } = await params;
  const { t } = await getTranslations();

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      campaign: { select: { id: true, name: true } },
      template: { select: { fieldNames: true } },
      submissions: { orderBy: { createdAt: "desc" }, take: MAX_ROWS },
      _count: { select: { submissions: true } },
    },
  });

  if (!form) notFound();

  return (
    <>
      <Breadcrumb
        items={[
          { label: t.campaign.title, href: "/admin/campaigns" },
          { label: form.campaign.name, href: `/admin/campaigns/${form.campaign.id}` },
          { label: form.title, href: `/admin/forms/${form.id}` },
          { label: t.submission.title },
        ]}
      />
      <PageHeader
        title={t.submission.title}
        description={t.submission.description
          .replace("{total}", form._count.submissions.toLocaleString("ko-KR"))
          .replace("{max}", String(MAX_ROWS))}
        action={
          <AnchorButton href={`/api/forms/${form.id}/submissions?format=csv`} variant="primary">
            {t.submission.exportCsv}
          </AnchorButton>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader
          title={t.submission.leads}
          hint={t.submission.showing.replace("{count}", String(form.submissions.length))}
        />
        {form.submissions.length === 0 ? (
          <EmptyState>
            {t.submission.empty}
          </EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t.submission.name}</Th>
                <Th>{t.submission.phone}</Th>
                <Th>{t.submission.email}</Th>
                <Th>{t.submission.channel}</Th>
                <Th>{t.submission.rawAnswer}</Th>
                <Th numeric>{t.submission.submittedAt}</Th>
              </tr>
            </THead>
            <TBody>
              {form.submissions.map((submission) => (
                <tr key={submission.id} className="transition-colors hover:bg-surface-2">
                  <Td className="font-medium text-ink">{submission.name ?? "—"}</Td>
                  <Td className="text-ink-2">{submission.phone ?? "—"}</Td>
                  <Td className="text-ink-2">{submission.email ?? "—"}</Td>
                  <Td>
                    <ChannelTag channel={submission.channel} />
                  </Td>
                  <Td>
                    <details className="group">
                      <summary className="cursor-pointer list-none text-xs text-ink-3 transition-colors hover:text-ink">
                        <span className="group-open:hidden">{t.submission.show} ▾</span>
                        <span className="hidden group-open:inline">{t.submission.hide} ▴</span>
                      </summary>
                      <pre className="mt-2 max-w-sm overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-ink-2">
                        {JSON.stringify(submission.data, null, 2)}
                      </pre>
                    </details>
                  </Td>
                  <Td numeric className="whitespace-nowrap text-ink-3">
                    {formatDate(submission.createdAt)}
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
