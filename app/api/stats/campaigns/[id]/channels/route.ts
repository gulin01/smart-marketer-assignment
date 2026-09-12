import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { getChannelStats } from "@/lib/stats";
import { parseDateRange } from "@/lib/date-range";
import { apiMessage } from "@/lib/i18n/api";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withOperator(async (_operator, request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;

  const range = parseDateRange(new URL(request.url).searchParams);
  if (!range.ok) {
    return apiError("VALIDATION_ERROR", await apiMessage("invalidDateRange"), range.issues);
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!campaign) return apiError("NOT_FOUND", await apiMessage("campaignNotFound"));

  return apiOk({ campaign, channels: await getChannelStats(id, range.range) });
});
