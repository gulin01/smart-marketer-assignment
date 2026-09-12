import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { getChannelStats } from "@/lib/stats";
import { parseDateRange } from "@/lib/date-range";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withOperator(async (_operator, request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;

  const range = parseDateRange(new URL(request.url).searchParams);
  if (!range.ok) {
    return apiError("VALIDATION_ERROR", "날짜 범위가 올바르지 않습니다", range.issues);
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!campaign) return apiError("NOT_FOUND", "캠페인을 찾을 수 없습니다");

  return apiOk({ campaign, channels: await getChannelStats(id, range.range) });
});
