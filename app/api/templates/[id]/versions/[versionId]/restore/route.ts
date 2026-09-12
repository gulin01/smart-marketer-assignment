import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { apiMessage } from "@/lib/i18n/api";
import { diffFields } from "@/lib/template";

type Ctx = { params: Promise<{ id: string; versionId: string }> };

/**
 * Restores a past snapshot. Non-destructive: the content being replaced is
 * itself written as a new version first, so restore can be undone by restoring.
 */
export const POST = withOperator(async (operator, _request: Request, ctx: Ctx) => {
  const { id, versionId } = await ctx.params;

  const [template, version] = await Promise.all([
    prisma.htmlTemplate.findUnique({ where: { id } }),
    prisma.templateVersion.findUnique({ where: { id: versionId } }),
  ]);

  if (!template) return apiError("NOT_FOUND", await apiMessage("templateNotFound"));
  if (!version || version.templateId !== id) {
    return apiError("NOT_FOUND", await apiMessage("versionNotFound"));
  }

  const [, updated] = await prisma.$transaction([
    prisma.templateVersion.create({
      data: {
        templateId: id,
        html: template.html,
        fieldNames: template.fieldNames,
        createdById: operator.operatorId,
        note: `restored-from:${versionId}`,
      },
    }),
    prisma.htmlTemplate.update({
      where: { id },
      data: { html: version.html, fieldNames: version.fieldNames },
    }),
  ]);

  return apiOk({
    template: updated,
    diff: diffFields(template.fieldNames, version.fieldNames),
  });
});
