import { getSession } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { apiMessage } from "@/lib/i18n/api";

export async function GET() {
  const session = await getSession();
  if (!session.operatorId) {
    return apiError("UNAUTHORIZED", await apiMessage("unauthorized"));
  }
  return apiOk({ id: session.operatorId, email: session.email });
}
