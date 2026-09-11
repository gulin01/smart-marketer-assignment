import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Breadcrumb, Card, ChannelBadge, EmptyState, PageHeader, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FormSubmissionsPage({
  params,
}: PageProps<"/admin/forms/[id]/submissions">) {
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      campaign: { select: { id: true, name: true } },
      template: { select: { fieldNames: true } },
      submissions: { orderBy: { createdAt: "desc" }, take: 500 },
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
        description={`최근 500건까지 표시합니다. 전체 데이터는 CSV로 내려받으세요.`}
        action={
          <a
            href={`/api/forms/${form.id}/submissions?format=csv`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            CSV 내보내기
          </a>
        }
      />

      <Card className="overflow-hidden">
        {form.submissions.length === 0 ? (
          <EmptyState>아직 제출된 내역이 없습니다.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
                <tr>
                  <th className="px-4 py-2.5 font-medium">이름</th>
                  <th className="px-4 py-2.5 font-medium">연락처</th>
                  <th className="px-4 py-2.5 font-medium">이메일</th>
                  <th className="px-4 py-2.5 font-medium">채널</th>
                  <th className="px-4 py-2.5 font-medium">제출일시</th>
                  <th className="px-4 py-2.5 font-medium">전체 응답</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {form.submissions.map((submission) => (
                  <tr key={submission.id} className="align-top">
                    <td className="px-4 py-3 font-medium">{submission.name ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                      {submission.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                      {submission.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ChannelBadge channel={submission.channel} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-500">
                      {formatDate(submission.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
                          보기
                        </summary>
                        <pre className="mt-2 max-w-md overflow-x-auto rounded bg-neutral-50 p-2 text-xs dark:bg-neutral-950">
                          {JSON.stringify(submission.data, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
