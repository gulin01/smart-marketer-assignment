import { prisma } from "@/lib/db";
import { Card, EmptyState, PageHeader, formatDate } from "@/components/ui";
import TemplateUpload from "./template-upload";
import TemplatePreview from "./template-preview";

export const metadata = { title: "HTML 템플릿 · Lead Magnet CRM" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await prisma.htmlTemplate.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      fieldNames: true,
      createdAt: true,
      _count: { select: { forms: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="HTML 템플릿"
        description="운영자가 업로드한 HTML 파일입니다. 업로드된 HTML은 수정되지 않고 그대로 저장되며, 렌더링 시 샌드박스 iframe 안에서만 실행됩니다."
      />

      <TemplateUpload />

      <Card className="mt-6 overflow-hidden">
        {templates.length === 0 ? (
          <EmptyState>아직 업로드된 템플릿이 없습니다.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
              <tr>
                <th className="px-4 py-2.5 font-medium">이름</th>
                <th className="px-4 py-2.5 font-medium">입력 필드</th>
                <th className="px-4 py-2.5 font-medium">사용 폼</th>
                <th className="px-4 py-2.5 font-medium">등록일</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-4 py-3 font-medium">{template.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {template.fieldNames.map((field) => (
                        <code
                          key={field}
                          className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800"
                        >
                          {field}
                        </code>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{template._count.forms}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(template.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <TemplatePreview templateId={template.id} name={template.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
