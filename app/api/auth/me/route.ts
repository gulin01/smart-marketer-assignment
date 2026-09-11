import { getSession } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";

export async function GET() {
  const session = await getSession();
  if (!session.operatorId) {
    return apiError("UNAUTHORIZED", "Authentication required");
  }
  return apiOk({ id: session.operatorId, email: session.email });
}
