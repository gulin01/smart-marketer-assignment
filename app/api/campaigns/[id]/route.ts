import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { apiMessage } from "@/lib/i18n/api";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withOperator(async (_operator, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      forms: {
        orderBy: { createdAt: "desc" },
        include: { links: true, template: { select: { id: true, name: true } } },
      },
    },
  });
  if (!campaign) return apiError("NOT_FOUND", await apiMessage("campaignNotFound"));
  return apiOk(campaign);
});
