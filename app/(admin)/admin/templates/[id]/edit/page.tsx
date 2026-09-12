import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTranslations } from "@/lib/i18n";
import { Breadcrumb } from "@/components/ui";
import TemplateEditor from "./template-editor";

export const dynamic = "force-dynamic";

export default async function TemplateEditPage({
  params,
}: PageProps<"/admin/templates/[id]/edit">) {
  const { id } = await params;
  const { t } = await getTranslations();

  const template = await prisma.htmlTemplate.findUnique({
    where: { id },
    include: {
      forms: { select: { campaignId: true } },
      _count: { select: { versions: true } },
    },
  });

  if (!template) notFound();

  return (
    <>
      <Breadcrumb
        items={[
          { label: t.template.title, href: "/admin/templates" },
          { label: template.name, href: "/admin/templates" },
          { label: t.editor.title },
        ]}
      />
      <TemplateEditor
        templateId={template.id}
        initialName={template.name}
        initialHtml={template.html}
        initialFields={template.fieldNames}
        usage={{
          forms: template.forms.length,
          campaigns: new Set(template.forms.map((form) => form.campaignId)).size,
        }}
        versionCount={template._count.versions}
        t={t.editor}
      />
    </>
  );
}
