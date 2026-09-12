import { getSession } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";

export async function GET() {
  const session = await getSession();
  if (!session.operatorId) {
    return apiError("UNAUTHORIZED", "로그인이 필요합니다");
  }
  return apiOk({ id: session.operatorId, email: session.email });
}
