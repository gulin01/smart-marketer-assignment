import { prisma } from "@/lib/db";
import {
  Card,
  CardHeader,
  Code,
  EmptyState,
  PageHeader,
  TBody,
  THead,
  Table,
  Td,
  Th,
  formatDate,
} from "@/components/ui";
import TemplateUpload from "./template-upload";
import TemplatePreview from "./template-preview";

export const metadata = { title: "템플릿 · Lead Magnet CRM" };
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
        description="업로드한 HTML은 수정 없이 그대로 저장되고, 방문자에게는 샌드박스 iframe 안에서만 렌더링됩니다. `<form>` 하나와 이름이 있는 입력 필드가 필요합니다."
      />

      <TemplateUpload />

      <Card className="mt-5 overflow-hidden">
        <CardHeader title="등록된 템플릿" hint={`${templates.length}개`} />
        {templates.length === 0 ? (
          <EmptyState>아직 업로드된 템플릿이 없습니다.</EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>이름</Th>
                <Th>입력 필드</Th>
                <Th numeric>사용 폼</Th>
                <Th numeric>등록일</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {templates.map((template) => (
                <tr key={template.id} className="transition-colors hover:bg-surface-2">
                  <Td className="font-medium text-ink">{template.name}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {template.fieldNames.map((field) => (
                        <Code key={field}>{field}</Code>
                      ))}
                    </div>
                  </Td>
                  <Td numeric>{template._count.forms}</Td>
                  <Td numeric className="whitespace-nowrap text-ink-3">
                    {formatDate(template.createdAt)}
                  </Td>
                  <Td className="text-right">
                    <TemplatePreview templateId={template.id} name={template.name} />
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
