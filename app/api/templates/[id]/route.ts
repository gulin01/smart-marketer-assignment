import { z } from "zod";
import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { apiMessage } from "@/lib/i18n/api";
import { TemplateValidationError, diffFields, parseTemplate } from "@/lib/template";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  html: z.string().min(1),
  /** Required only when the edit drops a field that already holds data. */
  confirmFieldRemoval: z.boolean().optional(),
});

export const GET = withOperator(async (_operator, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;

  const template = await prisma.htmlTemplate.findUnique({
    where: { id },
    include: {
      forms: { select: { id: true, title: true, campaignId: true } },
      _count: { select: { versions: true } },
    },
  });
  if (!template) return apiError("NOT_FOUND", await apiMessage("templateNotFound"));

  const { forms, _count, ...rest } = template;
  return apiOk({
    ...rest,
    versionCount: _count.versions,
    usage: {
      forms: forms.length,
      campaigns: new Set(forms.map((form) => form.campaignId)).size,
    },
  });
});

/**
 * Saves an edit in place: the template row keeps its id, so every form already
 * pointing at it serves the new HTML immediately (ADR 0009). The previous
 * content is snapshotted first, making the edit reversible.
 */
export const PUT = withOperator(async (operator, request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", await apiMessage("invalidBody"), parsed.error.issues);
  }

  const existing = await prisma.htmlTemplate.findUnique({
    where: { id },
    include: { forms: { select: { id: true } } },
  });
  if (!existing) return apiError("NOT_FOUND", await apiMessage("templateNotFound"));

  let fieldNames: string[];
  try {
    ({ fieldNames } = parseTemplate(parsed.data.html));
  } catch (error) {
    if (error instanceof TemplateValidationError) {
      return apiError("VALIDATION_ERROR", await apiMessage(error.key, error.values));
    }
    throw error;
  }

  const diff = diffFields(existing.fieldNames, fieldNames);

  // Dropping a field that already has answers is the one case worth interrupting
  // for. Existing rows keep their data; it simply stops being collected.
  if (diff.removed.length > 0 && !parsed.data.confirmFieldRemoval) {
    const formIds = existing.forms.map((form) => form.id);
    const affected = formIds.length
      ? await prisma.submission.count({ where: { formId: { in: formIds } } })
      : 0;

    return apiError("CONFLICT", await apiMessage("fieldsRemoved"), {
      removedFields: diff.removed,
      affectedSubmissions: affected,
      requiresConfirmation: true,
    });
  }

  const [, updated] = await prisma.$transaction([
    prisma.templateVersion.create({
      data: {
        templateId: id,
        html: existing.html,
        fieldNames: existing.fieldNames,
        createdById: operator.operatorId,
      },
    }),
    prisma.htmlTemplate.update({
      where: { id },
      data: {
        html: parsed.data.html,
        fieldNames,
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
      },
    }),
  ]);

  return apiOk({ template: updated, diff });
});

export const DELETE = withOperator(async (_operator, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const formCount = await prisma.form.count({ where: { templateId: id } });
  if (formCount > 0) {
    return apiError("CONFLICT", await apiMessage("templateInUse", { count: formCount }));
  }
  const deleted = await prisma.htmlTemplate.deleteMany({ where: { id } });
  if (deleted.count === 0) return apiError("NOT_FOUND", await apiMessage("templateNotFound"));
  return apiOk({ ok: true });
});
