import { z } from "zod";
import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
});

export const GET = withOperator(async (_operator, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      links: true,
      campaign: { select: { id: true, name: true } },
      template: { select: { id: true, name: true, fieldNames: true } },
      _count: { select: { visits: true, submissions: true } },
    },
  });
  if (!form) return apiError("NOT_FOUND", "Form not found");
  return apiOk(form);
});

export const PATCH = withOperator(async (_operator, request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid request body", parsed.error.issues);
  }
  const updated = await prisma.form.updateMany({ where: { id }, data: parsed.data });
  if (updated.count === 0) return apiError("NOT_FOUND", "Form not found");
  return apiOk(await prisma.form.findUnique({ where: { id }, include: { links: true } }));
});
