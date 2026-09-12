import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { apiMessage } from "@/lib/i18n/api";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withOperator(async (_operator, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;

  const template = await prisma.htmlTemplate.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!template) return apiError("NOT_FOUND", await apiMessage("templateNotFound"));

  const versions = await prisma.templateVersion.findMany({
    where: { templateId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    // The HTML itself can be 200 KB; the list only needs metadata.
    select: {
      id: true,
      fieldNames: true,
      note: true,
      createdAt: true,
      createdBy: { select: { email: true } },
    },
  });

  return apiOk({ versions });
});
