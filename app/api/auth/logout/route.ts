import { getSession } from "@/lib/session";
import { apiOk } from "@/lib/http";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return apiOk({ ok: true });
}
