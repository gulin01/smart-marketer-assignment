import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { getCampaignStats } from "@/lib/stats";
import { parseDateRange } from "@/lib/date-range";

export const GET = withOperator(async (_operator, request: Request) => {
  const range = parseDateRange(new URL(request.url).searchParams);
  if (!range.ok) {
    return apiError("VALIDATION_ERROR", "날짜 범위가 올바르지 않습니다", range.issues);
  }
  return apiOk({ campaigns: await getCampaignStats(range.range) });
});
