import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { getCampaignStats } from "@/lib/stats";
import { parseDateRange } from "@/lib/date-range";
import { apiMessage } from "@/lib/i18n/api";

export const GET = withOperator(async (_operator, request: Request) => {
  const range = parseDateRange(new URL(request.url).searchParams);
  if (!range.ok) {
    return apiError("VALIDATION_ERROR", await apiMessage("invalidDateRange"), range.issues);
  }
  return apiOk({ campaigns: await getCampaignStats(range.range) });
});
