import { prisma } from "@/lib/db";
import {
  Card,
  CardHeader,
  Code,
  EmptyState,
  LinkButton,
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
import { getTranslations } from "@/lib/i18n";

export const metadata = { title: "템플릿 · Lead Magnet CRM" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const { t } = await getTranslations();
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
        title={t.template.title}
        description={t.template.description}
      />

      <TemplateUpload t={t.template} />

      <Card className="mt-5 overflow-hidden">
        <CardHeader title={t.template.registered} hint={String(templates.length)} />
        {templates.length === 0 ? (
          <EmptyState>{t.template.empty}</EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t.template.name}</Th>
                <Th>{t.template.fields}</Th>
                <Th numeric>{t.template.usedByForms}</Th>
                <Th numeric>{t.template.registeredAt}</Th>
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
                    <div className="flex justify-end gap-2">
                      <TemplatePreview
                        templateId={template.id}
                        name={template.name}
                        t={t.template}
                      />
                      <LinkButton
                        href={`/admin/templates/${template.id}/edit`}
                        className="px-2.5 py-1 text-xs"
                      >
                        {t.template.edit}
                      </LinkButton>
                    </div>
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
