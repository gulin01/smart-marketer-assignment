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

export const dynamic = "force-dynamic";

const MAX_ROWS = 500;

export default async function FormSubmissionsPage({
  params,
}: PageProps<"/admin/forms/[id]/submissions">) {
  const { id } = await params;

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
          { label: "캠페인", href: "/admin/campaigns" },
          { label: form.campaign.name, href: `/admin/campaigns/${form.campaign.id}` },
          { label: form.title, href: `/admin/forms/${form.id}` },
          { label: "제출 내역" },
        ]}
      />
      <PageHeader
        title="제출 내역"
        description={`수집된 리드 ${form._count.submissions.toLocaleString("ko-KR")}건. 화면에는 최근 ${MAX_ROWS}건까지 표시되며, 전체는 CSV로 내려받을 수 있습니다.`}
        action={
          <AnchorButton href={`/api/forms/${form.id}/submissions?format=csv`} variant="primary">
            CSV 내보내기
          </AnchorButton>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader title="리드" hint={`표시 ${form.submissions.length}건`} />
        {form.submissions.length === 0 ? (
          <EmptyState>
            아직 제출된 내역이 없습니다. 배포 링크를 공유하면 여기에 리드가 쌓입니다.
          </EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>이름</Th>
                <Th>연락처</Th>
                <Th>이메일</Th>
                <Th>채널</Th>
                <Th>전체 응답</Th>
                <Th numeric>제출일시</Th>
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
                        <span className="group-open:hidden">보기 ▾</span>
                        <span className="hidden group-open:inline">접기 ▴</span>
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
