import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withOperator(async (_operator, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const template = await prisma.htmlTemplate.findUnique({ where: { id } });
  if (!template) return apiError("NOT_FOUND", "Template not found");
  return apiOk(template);
});

export const DELETE = withOperator(async (_operator, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const formCount = await prisma.form.count({ where: { templateId: id } });
  if (formCount > 0) {
    return apiError("CONFLICT", `Template is used by ${formCount} form(s)`);
  }
  const deleted = await prisma.htmlTemplate.deleteMany({ where: { id } });
  if (deleted.count === 0) return apiError("NOT_FOUND", "Template not found");
  return apiOk({ ok: true });
});
